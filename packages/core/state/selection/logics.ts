import { castArray, find, sortBy, uniqWith } from "lodash";
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
    SELECT_NEARBY_FILE,
} from "./actions";
import { interaction, metadata, ReduxLogicDeps, selection } from "../";
import * as selectionSelectors from "./selectors";
import Annotation from "../../entity/Annotation";
import FileExplorerURL from "../../entity/FileExplorerURL";
import FileFilter from "../../entity/FileFilter";
import FileFolder from "../../entity/FileFolder";
import FileSelection from "../../entity/FileSelection";
import FileSet from "../../entity/FileSet";

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
        if (find(existingHierarchy, (a) => a.name === annotation.name)) {
            const removed = existingHierarchy.filter((a) => a.name !== annotation.name);

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

/**
 * Interceptor responsible for processing SELECT_NEARBY_FILE actions into SET_FILE_SELECTION actions.
 */
const selectNearbyFile = createLogic({
    async transform(deps: ReduxLogicDeps, next, reject) {
        const { direction, updateExistingSelection } = deps.action.payload;
        const fileService = interaction.selectors.getFileService(deps.getState());
        const fileSelection = selectionSelectors.getFileSelection(deps.getState());
        const hierarchy = selectionSelectors.getAnnotationHierarchy(deps.getState());
        const openFileFolders = selectionSelectors.getOpenFileFolders(deps.getState());
        const sortColumn = selectionSelectors.getSortColumn(deps.getState());

        const openFileListPaths = openFileFolders.filter(
            (fileFolder) => fileFolder.size() === hierarchy.length
        );
        const sortedOpenFileListPaths = FileFolder.sort(openFileListPaths);

        const currentFocusedItem = fileSelection.focusedItem;
        // No-op no files are currently focused so no jumping off point to navigate from
        if (!currentFocusedItem) {
            reject && reject(deps.action);
            return;
        }

        // Determine the file folder the current focused item is in as well as the relative
        // position of the file list compared to the other open file lists
        const fileFolderForCurrentFocusedItem = new FileFolder(
            currentFocusedItem.fileSet.filters.map((filter) => filter.value)
        );
        const indexOfFocusedFileList = sortedOpenFileListPaths.findIndex((fileFolder) =>
            fileFolder.equals(fileFolderForCurrentFocusedItem)
        );

        // If not updating the existing selection start from scratch
        let newFileSelection = updateExistingSelection ? fileSelection : new FileSelection();

        // If the direction specified is "up" move to the file one row above the currently
        // focused one. If already at the top of the file list navigate to the bottom of the next open
        // file list above the current one. If already at the top file list and top file for that file list
        // no operation is performed.
        if (direction === "up") {
            const indexAboveCurrentFileSetIndex = currentFocusedItem.indexWithinFileSet - 1;
            if (indexAboveCurrentFileSetIndex >= 0) {
                // If not at the top of the current file list navigate one row up
                newFileSelection = newFileSelection.select({
                    index: indexAboveCurrentFileSetIndex,
                    fileSet: currentFocusedItem.fileSet,
                    sortOrder: currentFocusedItem.sortOrder,
                });
            } else if (indexOfFocusedFileList > 0) {
                // If not at the top file list (but at the top of this file list) navigate
                // to the bottom of the next open file list above this one
                const fileListIndexAboveCurrentFileList = indexOfFocusedFileList - 1;
                const openFileSetAboveCurrent = new FileSet({
                    fileService,
                    // Determine the filters of the previous file list based on the hierarchy & path
                    // needed to open the file folder
                    filters: sortedOpenFileListPaths[
                        fileListIndexAboveCurrentFileList
                    ].fileFolder.map(
                        (filterValue, index) =>
                            new FileFilter(hierarchy[index].displayName, filterValue)
                    ),
                    sortOrder: sortColumn,
                });
                const totalFileSetSize = await openFileSetAboveCurrent.fetchTotalCount();
                newFileSelection = newFileSelection.select({
                    index: totalFileSetSize - 1,
                    fileSet: openFileSetAboveCurrent,
                    sortOrder: currentFocusedItem.sortOrder,
                });
            } else {
                // No-op no file above to navigate to
                reject && reject(deps.action);
                return;
            }
        } else {
            // direction === "down"
            const indexBelowCurrentFileSetIndex = currentFocusedItem.indexWithinFileSet + 1;
            const fileListIndexBelowCurrentFileList = indexOfFocusedFileList + 1;
            const totalFileSetSize = await currentFocusedItem.fileSet.fetchTotalCount();
            if (indexBelowCurrentFileSetIndex < totalFileSetSize) {
                // If not at the bottom of the current file list navigate one row down
                newFileSelection = newFileSelection.select({
                    index: indexBelowCurrentFileSetIndex,
                    fileSet: currentFocusedItem.fileSet,
                    sortOrder: currentFocusedItem.sortOrder,
                });
            } else if (fileListIndexBelowCurrentFileList < sortedOpenFileListPaths.length) {
                // If not at the bottom file list (but at the bottom of this file list) navigate
                // to the top of the next open file list below this one
                const openFileSetBelowCurrent = new FileSet({
                    fileService,
                    // Determine the filters of the next file list based on the hierarchy & path
                    // needed to open the file folder
                    filters: sortedOpenFileListPaths[
                        fileListIndexBelowCurrentFileList
                    ].fileFolder.map(
                        (filterValue, index) =>
                            new FileFilter(hierarchy[index].displayName, filterValue)
                    ),
                    sortOrder: sortColumn,
                });
                newFileSelection = newFileSelection.select({
                    index: 0,
                    fileSet: openFileSetBelowCurrent,
                    sortOrder: currentFocusedItem.sortOrder,
                });
            } else {
                // No-op no file below to navigate to
                reject && reject(deps.action);
                return;
            }
        }
        next(selection.actions.setFileSelection(newFileSelection));
    },
    type: [SELECT_NEARBY_FILE],
});

export default [
    selectFile,
    modifyAnnotationHierarchy,
    modifyFileFilters,
    toggleFileFolderCollapse,
    decodeFileExplorerURL,
    selectNearbyFile,
    setAvailableAnnotationsLogic,
];
