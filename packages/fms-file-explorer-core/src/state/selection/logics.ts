import { castArray, find, includes, sortBy, uniqWith, without } from "lodash";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";
import { batch } from "react-redux";

import {
    ADD_FILE_FILTER,
    SELECT_FILE,
    REORDER_ANNOTATION_HIERARCHY,
    REMOVE_FILE_FILTER,
    REMOVE_FROM_ANNOTATION_HIERARCHY,
    SelectFileAction,
    setAnnotationHierarchy,
    setAvailableAnnotations,
    setFileFilters,
    setFileSelection,
    TOGGLE_FILE_FOLDER_COLLAPSE,
    setOpenFileFolders,
    DECODE_FILE_EXPLORER_URL,
    SET_ANNOTATION_HIERARCHY,
} from "./actions";
import { interaction, metadata, ReduxLogicDeps } from "../";
import * as selectionSelectors from "./selectors";
import Annotation from "../../entity/Annotation";
import FileExplorerURL from "../../entity/FileExplorerURL";
import FileFilter from "../../entity/FileFilter";
import FileFolder from "../../entity/FileFolder";
import FileSelection from "../../entity/FileSelection";

/**
 * Interceptor responsible for transforming payload of SELECT_FILE actions to account for whether the intention is to
 * add to existing selected files state, to replace existing selection state, or to remove a file from the existing
 * selection state.
 */
const selectFile = createLogic({
    transform(deps: ReduxLogicDeps, next: (action: AnyAction) => void) {
        const { getState } = deps;
        const {
            payload: { fileSet, lastTouched, selection, sortOrder, updateExistingSelection },
        } = deps.action as SelectFileAction;
        const existingFileSelections = selectionSelectors.getFileSelection(getState());

        if (updateExistingSelection) {
            if (existingFileSelections.isSelected(fileSet, selection)) {
                const nextFileSelection = existingFileSelections.deselect(fileSet, selection);
                next(setFileSelection(nextFileSelection));
                return;
            } else {
                const nextFileSelection = existingFileSelections.select({
                    fileSet,
                    index: selection,
                    sortOrder,
                    indexToFocus: lastTouched,
                });
                next(setFileSelection(nextFileSelection));
                return;
            }
        }

        // special case: fast path for deselecting a file if it is the only one selected
        // (no need to have held down keyboard modifier)
        if (
            existingFileSelections.count() === 1 &&
            existingFileSelections.isSelected(fileSet, selection)
        ) {
            next(setFileSelection(new FileSelection()));
            return;
        }

        const nextFileSelection = new FileSelection().select({
            fileSet,
            index: selection,
            sortOrder,
            indexToFocus: lastTouched,
        });
        next(setFileSelection(nextFileSelection));
    },
    type: SELECT_FILE,
});

/**
 * Interceptor responsible for transforming REORDER_ANNOTATION_HIERARCHY and REMOVE_FROM_ANNOTATION_HIERARCHY actions into
 * a concrete list of ordered annotations that can be directly stored in application state under `selections.annotationHierarchy`.
 */
const modifyAnnotationHierarchy = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { action, getState, ctx } = deps;
        const { existingHierarchy, originalPayload } = ctx;
        const currentHierarchy: Annotation[] = action.payload;

        const existingOpenFileFolders = selectionSelectors.getOpenFileFolders(getState());

        let openFileFolders: FileFolder[];
        if (existingHierarchy.length > currentHierarchy.length) {
            // Determine which index the remove occurred
            const indexOfRemoval = existingHierarchy.findIndex(
                (a: Annotation) => a.name === originalPayload.id
            );

            // Determine the new folders now that an annotation has been removed
            // removing any that can't be used anymore
            openFileFolders = existingOpenFileFolders
                .map((ff) => ff.removeAnnotationAtIndex(indexOfRemoval))
                .filter((ff) => !ff.isEmpty());
        } else if (existingHierarchy.length < currentHierarchy.length) {
            // Determine the new folders now that an annotation has been added
            // removing any that can't be used anymore
            openFileFolders = existingOpenFileFolders
                .map((ff) => ff.addAnnotationAtIndex(originalPayload.moveTo))
                .filter((ff) => !ff.isEmpty());
        } else {
            // Get mapping of old annotation locations to new annotation locations in the hierarchy
            const annotationIndexMap = currentHierarchy.reduce(
                (map, currentAnnotation, newIndex) => ({
                    ...map,
                    [newIndex]: existingHierarchy.findIndex(
                        (a: Annotation) => a.name === currentAnnotation.name
                    ),
                }),
                {}
            );

            // Use annotation index mapping to re-order annotation values in file folders
            openFileFolders = existingOpenFileFolders.reduce(
                (openFolders: FileFolder[], fileFolder) => [
                    ...openFolders,
                    ...fileFolder.reorderAnnotations(annotationIndexMap),
                ],
                []
            );
        }
        dispatch(setOpenFileFolders(uniqWith(openFileFolders, (f1, f2) => f1.equals(f2))));

        done();
    },
    transform(deps: ReduxLogicDeps, next, reject) {
        const { action, getState, ctx } = deps;

        const existingHierarchy = selectionSelectors.getAnnotationHierarchy(getState());
        ctx.existingHierarchy = existingHierarchy;
        ctx.originalPayload = action.payload;
        const allAnnotations = metadata.selectors.getAnnotations(getState());
        const annotation = find(
            allAnnotations,
            (annotation) => annotation.name === action.payload.id
        );

        if (annotation === undefined) {
            reject && reject(action); // reject is for some reason typed in react-logic as optional
            return;
        }

        let nextHierarchy: Annotation[];
        if (includes(existingHierarchy, annotation)) {
            const removed = without(existingHierarchy, annotation);

            // if moveTo is defined, change the order
            // otherwise, remove it from the hierarchy
            if (action.payload.moveTo !== undefined) {
                // change order
                removed.splice(action.payload.moveTo, 0, annotation);
            }

            nextHierarchy = removed;
        } else {
            // add to list
            nextHierarchy = Array.from(existingHierarchy);
            nextHierarchy.splice(action.payload.moveTo, 0, annotation);
        }

        next(setAnnotationHierarchy(nextHierarchy));
    },
    type: [REORDER_ANNOTATION_HIERARCHY, REMOVE_FROM_ANNOTATION_HIERARCHY],
});

const setAvailableAnnotationsLogic = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { action, httpClient, getState } = deps;
        const annotationNamesInHierachy = action.payload.map((a: Annotation) => a.name);
        const annotationService = interaction.selectors.getAnnotationService(getState());
        const applicationVersion = interaction.selectors.getApplicationVersion(getState());
        if (applicationVersion) {
            annotationService.setApplicationVersion(applicationVersion);
        }
        annotationService.setHttpClient(httpClient);

        try {
            dispatch(
                setAvailableAnnotations(
                    await annotationService.fetchAvailableAnnotationsForHierarchy(
                        annotationNamesInHierachy
                    )
                )
            );
        } catch (err) {
            console.error(
                "Something went wrong finding available annotations, nobody knows why. But here's a hint:",
                err
            );
            const annotations = metadata.selectors.getAnnotations(getState());
            dispatch(setAvailableAnnotations(annotations.map((a: Annotation) => a.name)));
        } finally {
            done();
        }
    },
    type: [SET_ANNOTATION_HIERARCHY],
});

/**
 * Interceptor responsible for transforming ADD_FILE_FILTER and REMOVE_FILE_FILTER
 * actions into a concrete list of ordered FileFilters that can be stored directly in
 * application state under `selections.filters`.
 */
const modifyFileFilters = createLogic({
    transform(deps: ReduxLogicDeps, next, reject) {
        const { action, getState } = deps;

        const previousFilters = selectionSelectors.getFileFilters(getState());
        let nextFilters: FileFilter[];

        const incomingFilters = castArray(action.payload);
        if (action.type === ADD_FILE_FILTER) {
            nextFilters = uniqWith(
                [...previousFilters, ...incomingFilters],
                (existing, incoming) => {
                    return existing.equals(incoming);
                }
            );
        } else {
            nextFilters = previousFilters.filter((existing) => {
                return !incomingFilters.some((incoming) => incoming.equals(existing));
            });
        }

        const sortedNextFilters = sortBy(nextFilters, ["name", "value"]);

        const filtersAreUnchanged =
            previousFilters.length === sortedNextFilters.length &&
            previousFilters.every((existing) =>
                sortedNextFilters.some((incoming) => incoming.equals(existing))
            );

        if (filtersAreUnchanged) {
            reject && reject(action);
            return;
        }

        next(setFileFilters(sortedNextFilters));
    },
    type: [ADD_FILE_FILTER, REMOVE_FILE_FILTER],
});

/**
 * Interceptor responsible for transforming TOGGLE_FILE_FOLDER_COLLAPSE actions into
 * SET_OPEN_FILE_FOLDERS actions by determining whether the file folder is to be considered
 * open or collapsed.
 */
const toggleFileFolderCollapse = createLogic({
    transform(deps: ReduxLogicDeps, next) {
        const fileFolder: FileFolder = deps.action.payload;
        const openFileFolders = selectionSelectors.getOpenFileFolders(deps.getState());
        // If the file folder is already open, collapse it by removing it
        if (openFileFolders.find((f) => f.equals(fileFolder))) {
            next(
                setOpenFileFolders(
                    openFileFolders.filter((f) => !f.includesSubFileFolder(fileFolder))
                )
            );
        } else {
            next(setOpenFileFolders([...openFileFolders, fileFolder]));
        }
    },
    type: [TOGGLE_FILE_FOLDER_COLLAPSE],
});

/**
 * Interceptor responsible for processing DECODE_FILE_EXPLORER_URL actions into various
 * other actions responsible for rehydrating the FileExplorerURL into application state.
 */
const decodeFileExplorerURL = createLogic({
    process(deps: ReduxLogicDeps, dispatch, done) {
        const encodedURL = deps.action.payload;
        const annotations = metadata.selectors.getAnnotations(deps.getState());
        const { hierarchy, filters, openFolders } = FileExplorerURL.decode(encodedURL, annotations);
        batch(() => {
            dispatch(setAnnotationHierarchy(hierarchy));
            dispatch(setFileFilters(filters));
            dispatch(setOpenFileFolders(openFolders));
        });
        done();
    },
    type: [DECODE_FILE_EXPLORER_URL],
});

export default [
    selectFile,
    modifyAnnotationHierarchy,
    modifyFileFilters,
    toggleFileFolderCollapse,
    decodeFileExplorerURL,
    setAvailableAnnotationsLogic,
];
