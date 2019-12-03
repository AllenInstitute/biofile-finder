import { castArray, find, includes, isArray, uniq, without } from "lodash";
import { createLogic } from "redux-logic";

import { getAnnotationHierarchy, getSelectedFiles } from "./selectors";
import metadata from "../metadata";
import {
    deselectFile,
    SELECT_FILE,
    REORDER_ANNOTATION_HIERARCHY,
    REMOVE_FROM_ANNOTATION_HIERARCHY,
    setAnnotationHierarchy,
} from "./actions";
import { ReduxLogicDeps, ReduxLogicNextCb } from "../types";

/**
 * Interceptor responsible for transforming payload of SELECT_FILE actions to account for whether the intention is to
 * add to existing selected files state, to replace existing selection state, or to remove a file from the existing
 * selection state.
 */
const selectFile = createLogic({
    transform(deps: ReduxLogicDeps, next: ReduxLogicNextCb) {
        const { action, getState } = deps;

        if (action.payload.updateExistingSelection) {
            const existingSelections = getSelectedFiles(getState());

            // if updating existing selections and clicked file is already selected, interpret as a deselect action
            // ensure clicked file is not a list of files--that case is more difficult to guess user intention
            if (
                !isArray(action.payload.file) &&
                includes(existingSelections, action.payload.file)
            ) {
                next(deselectFile(action.payload.file));
            } else {
                next({
                    ...action,
                    payload: {
                        ...action.payload,
                        file: uniq([...existingSelections, ...castArray(action.payload.file)]),
                    },
                });
            }
        } else {
            next({
                ...action,
                payload: {
                    ...action.payload,
                    file: castArray(action.payload.file),
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
    process(deps: ReduxLogicDeps, dispatch, done) {
        const { action, getState } = deps;

        const existingHierarchy = getAnnotationHierarchy(getState());
        const allAnnotations = metadata.selectors.getAnnotations(getState());
        const annotation = find(
            allAnnotations,
            (annotation) => annotation.name === action.payload.id
        );

        if (!annotation) {
            done();
            return;
        }

        if (includes(existingHierarchy, annotation)) {
            const removed = without(existingHierarchy, annotation);
            if (action.payload.moveTo !== undefined) {
                // change order
                removed.splice(action.payload.moveTo, 0, annotation);
                dispatch(setAnnotationHierarchy(removed));
            } else {
                // remove from list
                dispatch(setAnnotationHierarchy(removed));
            }
        } else {
            // add to list
            const newHierarchy = Array.from(existingHierarchy);
            newHierarchy.splice(action.payload.moveTo, 0, annotation);
            dispatch(setAnnotationHierarchy(newHierarchy));
        }

        done();
    },
    type: [REORDER_ANNOTATION_HIERARCHY, REMOVE_FROM_ANNOTATION_HIERARCHY],
});

export default [selectFile, modifyAnnotationHierarchy];
