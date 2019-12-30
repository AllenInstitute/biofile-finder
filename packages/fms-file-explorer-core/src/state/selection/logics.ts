import { castArray, find, includes, isArray, uniq, without } from "lodash";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";

import {
    deselectFile,
    SELECT_FILE,
    REORDER_ANNOTATION_HIERARCHY,
    REMOVE_FROM_ANNOTATION_HIERARCHY,
    setAnnotationHierarchy,
} from "./actions";
import Annotation from "../../entity/Annotation";
import metadata from "../metadata";
import { getAnnotationHierarchy, getSelectedFiles } from "./selectors";
import { ReduxLogicDeps } from "../";

/**
 * Interceptor responsible for transforming payload of SELECT_FILE actions to account for whether the intention is to
 * add to existing selected files state, to replace existing selection state, or to remove a file from the existing
 * selection state.
 */
const selectFile = createLogic({
    transform(deps: ReduxLogicDeps, next: (action: AnyAction) => void) {
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
 *
 * After TRANFORMing to a SET_ANNOTATION_HIERARCHY action and running through the reducer, PROCESS any newly added annotation to
 * request all unique values assigned to the annotation (across all of its usages in FMS) and dispatch a RECEIVE_ANNOTATION_VALUES
 * action to store the values in the `metadata` branch of application state.
 */
const modifyAnnotationHierarchy = createLogic({
    transform(deps: ReduxLogicDeps, next, reject) {
        const { action, getState } = deps;

        const existingHierarchy = getAnnotationHierarchy(getState());
        const allAnnotations = metadata.selectors.getAnnotations(getState());
        const annotation = find(
            allAnnotations,
            (annotation) => annotation.name === action.payload.id
        );

        if (annotation === undefined) {
            reject && reject(action); // reject is for some reason typed in react-logic as optional
            return;
        }

        if (includes(existingHierarchy, annotation)) {
            const removed = without(existingHierarchy, annotation);
            if (action.payload.moveTo !== undefined) {
                // change order
                removed.splice(action.payload.moveTo, 0, annotation);
                next(setAnnotationHierarchy(removed));
            } else {
                // remove from list
                next(setAnnotationHierarchy(removed));
            }
        } else {
            // add to list
            const newHierarchy = Array.from(existingHierarchy);
            newHierarchy.splice(action.payload.moveTo, 0, annotation);

            // Before moving on, set new annotation into this logic's context so that we have simple access to it
            // in the process hook. All unique values assigned to the annotation (across all of its usages in FMS)
            // will be loaded and stored in the metadata branch of state.
            deps.ctx.annotation = annotation;

            next(setAnnotationHierarchy(newHierarchy));
        }
    },
    async process(deps, dispatch, done) {
        const { ctx } = deps;
        const annotation: Annotation | undefined = ctx.annotation;

        if (annotation === undefined) {
            done();
            return;
        }

        dispatch(
            metadata.actions.receiveAnnotationValues(
                annotation.name,
                await annotation.fetchValues()
            )
        );
        done();
    },
    type: [REORDER_ANNOTATION_HIERARCHY, REMOVE_FROM_ANNOTATION_HIERARCHY],
});

export default [selectFile, modifyAnnotationHierarchy];
