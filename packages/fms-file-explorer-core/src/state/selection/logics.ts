import { castArray, find, includes, omit, sortBy, uniqWith, without } from "lodash";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";

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
} from "./actions";
import { interaction, metadata, ReduxLogicDeps } from "../";
import * as selectionSelectors from "./selectors";
import Annotation from "../../entity/Annotation";
import FileFilter from "../../entity/FileFilter";
import FileFolder from "../../entity/FileFolder";
import NumericRange from "../../entity/NumericRange";

/**
 * Interceptor responsible for transforming payload of SELECT_FILE actions to account for whether the intention is to
 * add to existing selected files state, to replace existing selection state, or to remove a file from the existing
 * selection state.
 */
const selectFile = createLogic({
    transform(deps: ReduxLogicDeps, next: (action: AnyAction) => void) {
        const { getState } = deps;
        const action = deps.action as SelectFileAction;
        const selection = action.payload.selection;
        let nextSelectionsForFileSet: NumericRange[];

        const existingSelectionsByFileSet = selectionSelectors.getSelectedFileRangesByFileSet(
            getState()
        );
        const existingSelectionsForFileSet =
            existingSelectionsByFileSet[action.payload.correspondingFileSet] || [];

        if (action.payload.updateExistingSelection && existingSelectionsForFileSet.length) {
            // A keyboard modifier has been used to tell the application to modify an existing selection.
            // Either remove from it or add to it.
            if (
                !NumericRange.isNumericRange(selection) &&
                existingSelectionsForFileSet.some((range: NumericRange) =>
                    range.contains(selection)
                )
            ) {
                // if updating existing selections and clicked file is already selected, interpret as a deselect action
                // ensure selection is not a range--that case is more difficult to guess user intention
                nextSelectionsForFileSet = existingSelectionsForFileSet.reduce(
                    (accum, range: NumericRange) => {
                        if (range.contains(selection)) {
                            try {
                                return [...accum, ...range.partitionAt(selection)];
                            } catch (EmptyRangeException) {
                                return accum;
                            }
                        }

                        return [...accum, range];
                    },
                    [] as NumericRange[]
                );
            } else {
                // else, add to existing selection
                nextSelectionsForFileSet = existingSelectionsForFileSet.reduce(
                    (accum, range: NumericRange) => {
                        if (NumericRange.isNumericRange(selection)) {
                            // combine ranges if they are continuous
                            if (range.abuts(selection)) {
                                return [...accum, range.union(selection)];
                            }

                            return [...accum, range, selection];
                        } else {
                            if (range.abuts(selection)) {
                                return [...accum, range.expandTo(selection)];
                            }

                            return [...accum, range, new NumericRange(selection, selection)];
                        }
                    },
                    [] as NumericRange[]
                );
            }
        } else if (
            existingSelectionsForFileSet.length === 1 &&
            existingSelectionsForFileSet[0].contains(selection)
        ) {
            // Only one file is selected, and user just clicked on it again. Interpret as a deselect.
            // The same thing can be accomplished by holding down the correct keyboard modifier, but,
            // don't make the user hold down a keyboard modifier in this special case.
            nextSelectionsForFileSet = [];
        } else {
            // Append to selection
            if (NumericRange.isNumericRange(selection)) {
                nextSelectionsForFileSet = [selection];
            } else {
                nextSelectionsForFileSet = [new NumericRange(selection)];
            }
        }

        nextSelectionsForFileSet = NumericRange.compact(...nextSelectionsForFileSet);

        let nextSelectionsByFileSet;
        if (action.payload.updateExistingSelection) {
            nextSelectionsByFileSet = {
                ...omit(existingSelectionsByFileSet, [action.payload.correspondingFileSet]),
            };
        } else {
            nextSelectionsByFileSet = {};
        }

        if (nextSelectionsForFileSet.length) {
            nextSelectionsByFileSet = {
                ...nextSelectionsByFileSet,
                [action.payload.correspondingFileSet]: nextSelectionsForFileSet,
            };
        }

        next(setFileSelection(nextSelectionsByFileSet));
    },
    type: SELECT_FILE,
});

/**
 * Interceptor responsible for transforming REORDER_ANNOTATION_HIERARCHY and REMOVE_FROM_ANNOTATION_HIERARCHY actions into
 * a concrete list of ordered annotations that can be directly stored in application state under `selections.annotationHierarchy`.
 */
const modifyAnnotationHierarchy = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { action, httpClient, getState, ctx } = deps;
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

        const annotationNamesInHierachy = action.payload.map((a: Annotation) => a.name);
        const annotationService = interaction.selectors.getAnnotationService(getState());
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

export default [selectFile, modifyAnnotationHierarchy, modifyFileFilters, toggleFileFolderCollapse];
