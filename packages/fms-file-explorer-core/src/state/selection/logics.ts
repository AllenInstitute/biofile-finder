import { castArray, find, includes, sortBy, uniqWith, without } from "lodash";
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

        if (action.payload.updateExistingSelection) {
            const existingSelectionsByFileSet = selectionSelectors.getSelectedFileRangesByFileSet(
                getState()
            );
            const existingSelections =
                existingSelectionsByFileSet[action.payload.correspondingFileSet] || [];

            if (
                !NumericRange.isNumericRange(selection) &&
                existingSelections.some((range: NumericRange) => range.contains(selection))
            ) {
                // if updating existing selections and clicked file is already selected, interpret as a deselect action
                // ensure selection is not a range--that case is more difficult to guess user intention
                nextSelectionsForFileSet = existingSelections.reduce(
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
                nextSelectionsForFileSet = existingSelections.reduce(
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
        } else {
            if (NumericRange.isNumericRange(selection)) {
                nextSelectionsForFileSet = [selection];
            } else {
                nextSelectionsForFileSet = [new NumericRange(selection)];
            }
        }

        next(
            setFileSelection(
                action.payload.correspondingFileSet,
                NumericRange.compact(...nextSelectionsForFileSet)
            )
        );
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
        const { existingHierarchy } = ctx;

        const existingOpenFileFolders = selectionSelectors.getOpenFileFolders(getState());
        const currentHierarchy: Annotation[] = action.payload;
        const FILE_FOLDER_SEPARATOR = "."; // TODO: Get better sentinal value to separate them

        console.log(`Existing Hierarchy: ${existingHierarchy}`);
        console.log(`Current Hierarchy: ${currentHierarchy}`);
        console.log(`Open File Folders (Before): ${existingOpenFileFolders}`);
        // If the hierarchies are not the same length then an insert or delete occured &
        // the open file folders need to be deleted/rearranged
        let openFileFolders: string[];
        if (existingHierarchy.length !== currentHierarchy.length) {
            // Determine which index the insert/delete occurred
            let modifiedIndex: number = -1;
            existingHierarchy.forEach((a: Annotation, index: number) => {
                if (modifiedIndex === -1 && a !== currentHierarchy[index]) {
                    modifiedIndex = index;
                }
            });
            if (modifiedIndex === -1) {
                modifiedIndex = currentHierarchy.length - 1;
            }

            if (existingHierarchy.length > currentHierarchy.length) {
                console.log(`Deleted Annotation at Index`);
                // If an annotation was removed from the hierarchy everything that is open
                // should be able to remain open
                openFileFolders = existingOpenFileFolders
                    .map((ff) =>
                        ff
                            .split(FILE_FOLDER_SEPARATOR)
                            .filter((_, index) => index !== modifiedIndex)
                            .join(FILE_FOLDER_SEPARATOR)
                    )
                    .filter((ff) => Boolean(ff));
            } else {
                console.log(`Inserted Annotation at Index`);
                console.log(modifiedIndex);
                // If an annotation was added to the hierarchy everything that is open above
                // the level where the annotation was added should be able to remain open
                openFileFolders = existingOpenFileFolders.map((ff) =>
                    ff
                        .split(FILE_FOLDER_SEPARATOR)
                        .filter((_, index) => index < modifiedIndex)
                        .join(FILE_FOLDER_SEPARATOR)
                );
            }
        } else {
            // If the lengths are the same then order of the annotations in the hierarchy changed &
            // everything should remain open but the values need to shift around.

            // Get mapping of old annotation locations to new annotation locations in the hierarchy
            const indexMap: { [oldIndex: number]: number } = {}; // oldIndex -> newIndex
            existingHierarchy.forEach((existingAnnotation: Annotation, oldIndex: number) => {
                currentHierarchy.forEach((currentAnnotation, newIndex) => {
                    if (existingAnnotation === currentAnnotation) {
                        indexMap[oldIndex] = newIndex;
                    }
                });
            });
            console.log(`Reordered Annotations`);
            console.log(indexMap);

            // Use annotation index mapping to re-order annotation values in file folders
            openFileFolders = [];
            existingOpenFileFolders.forEach((fileFolder) => {
                console.log(fileFolder);
                const fileFolderValues = fileFolder.split(FILE_FOLDER_SEPARATOR);
                console.log(fileFolderValues);
                const newFileFolderValues = [...new Array(currentHierarchy.length)];
                console.log(newFileFolderValues);
                fileFolderValues.forEach((value, index) => {
                    newFileFolderValues[indexMap[index]] = value;
                });

                // ex. false
                // ex. false.AICS-68
                // ex. false.AICS-68.true
                // ex. false.AICS-68.true.75 -> 75.false.AICS-68.true
                // ex.                       -> 75.false.AICS-68
                // ex.                       -> 75.false
                // ex.                       -> 75

                // ex. false
                // ex. false.AICS-68
                // ex. false.AICS-68.true
                // ex. false.AICS-68.true.75 -> AICS-68.true.75.false
                // ex.                       -> AICS-68.true.75
                // ex.                       -> AICS-68.true
                // ex.                       -> AICS-68
                // ex. false
                // ex. false.AICS-68
                // ex. false.AICS-68.true
                // ex. false.AICS-68.true.75 -> AICS-68.true.75.false
                // ex.                       -> AICS-68.true.75
                // ex.                       -> AICS-68.true // TODO: worry about uniqueness here
                // ex.                       -> AICS-68
                // ex. false.AICS-68.true.75.64 -> AICS-68.true.75.false.64
                // find old index of annotation that was moved
                // find new index (in old action)
                // add mini subset for each subset between moved location and desinition location

                if (moveTo >= fileFolderValues.length || moveFrom >= fileFolderValues.length) {
                    // is undefined
                }
                // annotationName -> open values
                // delete? delete the annotationName
                // insert? nothing
                // reoder? nothing

                fileFolderValues.forEach((value, index) => {
                    const newIndex = indexMap[index];
                    if (newIndex < index) {
                        // append
                        openFileFolders.push(value);
                    }
                    newFileFolderValues[newIndex] = value;
                });
                // [false, false.AICS-68] -> [AICS-68, AICS-68.false]
                // false -> undefined
                // false.AICS-68 -> AICS-68.false & AICS-68
                console.log(newFileFolderValues);
                let undefinedEncountered = false;
                for (const value in newFileFolderValues) {
                    if (value === undefined) {
                        undefinedEncountered = true;
                    } else if (undefinedEncountered) {
                        return;
                    }
                }
                openFileFolders.push(
                    newFileFolderValues.filter((ff) => ff !== undefined).join(FILE_FOLDER_SEPARATOR)
                );
            });
        }
        console.log(`Open File Folders (After): ${openFileFolders}`);
        dispatch(setOpenFileFolders(openFileFolders));

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
        const fileFolder: string = deps.action.payload;
        const openFileFolders = selectionSelectors.getOpenFileFolders(deps.getState());
        // If the file folder is already open, collapse it by removing it
        if (includes(openFileFolders, fileFolder)) {
            next(setOpenFileFolders(openFileFolders.filter((f) => f !== fileFolder)));
        } else {
            next(setOpenFileFolders([...openFileFolders, fileFolder]));
        }
    },
    type: [TOGGLE_FILE_FOLDER_COLLAPSE],
});

export default [selectFile, modifyAnnotationHierarchy, modifyFileFilters, toggleFileFolderCollapse];
