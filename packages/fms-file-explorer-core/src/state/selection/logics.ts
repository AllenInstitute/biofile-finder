import { castArray, find, includes, isArray, uniq, without } from "lodash";
import { createLogic } from "redux-logic";

import { getAnnotationHierarchy, getSelectedFiles } from "./selectors";
import metadata from "../metadata";
import {
    deselectFile,
    SELECT_FILE,
    MODIFY_ANNOTATION_HIERARCHY,
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

const modifyAnnotationHierarchy = createLogic({
    process(deps: ReduxLogicDeps, dispatch, done) {
        const { action, getState } = deps;

        const existingHierarchy = getAnnotationHierarchy(getState());
        const allAnnotations = metadata.selectors.getAnnotations(getState());
        const annotation = find(allAnnotations, (annotation) => annotation.name === action.payload);

        if (!annotation) {
            return;
        }

        if (includes(existingHierarchy, annotation)) {
            // remove from list
            dispatch(setAnnotationHierarchy(without(existingHierarchy, annotation)));
        } else {
            // add to list
            // TODO: in proper order
            dispatch(setAnnotationHierarchy([...existingHierarchy, annotation]));
        }

        done();
    },
    type: MODIFY_ANNOTATION_HIERARCHY,
});

export default [selectFile, modifyAnnotationHierarchy];
