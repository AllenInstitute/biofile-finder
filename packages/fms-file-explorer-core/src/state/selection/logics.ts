import { castArray, find, includes, isArray, sortBy, uniq, uniqWith, without } from "lodash";
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
    setFileFilters,
} from "./actions";
import metadata from "../metadata";
import * as selectionSelectors from "./selectors";
import { ReduxLogicDeps } from "../";
import Annotation from "../../entity/Annotation";
import FileFilter from "../../entity/FileFilter";

/**
 * Interceptor responsible for transforming payload of SELECT_FILE actions to account for whether the intention is to
 * add to existing selected files state, to replace existing selection state, or to remove a file from the existing
 * selection state.
 */
const selectFile = createLogic({
    transform(deps: ReduxLogicDeps, next: (action: AnyAction) => void) {
        const { getState } = deps;
        const action = deps.action as SelectFileAction;

        if (action.payload.updateExistingSelection) {
            const existingSelectionsByFileSet = selectionSelectors.getSelectedFilesByFileSet(
                getState()
            );
            const existingSelections =
                existingSelectionsByFileSet[action.payload.correspondingFileSet] || [];

            // if updating existing selections and clicked file is already selected, interpret as a deselect action
            // ensure clicked file is not a list of files--that case is more difficult to guess user intention
            if (
                !isArray(action.payload.fileIndex) &&
                includes(existingSelections, action.payload.fileIndex)
            ) {
                next({
                    ...action,
                    payload: {
                        ...action.payload,
                        fileIndex: without(
                            existingSelections,
                            ...castArray(action.payload.fileIndex)
                        ),
                    },
                });
            } else {
                next({
                    ...action,
                    payload: {
                        ...action.payload,
                        fileIndex: uniq([
                            ...existingSelections,
                            ...castArray(action.payload.fileIndex),
                        ]),
                    },
                });
            }
        } else {
            next({
                ...action,
                payload: {
                    ...action.payload,
                    fileIndex: castArray(action.payload.fileIndex),
                },
            });
        }
    },
    type: SELECT_FILE,
});

/**
 * Interceptor responsible for transforming REORDER_ANNOTATION_HIERARCHY and REMOVE_FROM_ANNOTATION_HIERARCHY actions into
 * a concrete list of ordered annotations that can be directly stored in application state under `selections.annotationHierarchy`.
 */
const modifyAnnotationHierarchy = createLogic({
    transform(deps: ReduxLogicDeps, next, reject) {
        const { action, getState } = deps;

        const existingHierarchy = selectionSelectors.getAnnotationHierarchy(getState());
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

export default [selectFile, modifyAnnotationHierarchy, modifyFileFilters];
