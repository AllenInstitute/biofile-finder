import { castArray, uniq } from "lodash";
import { createLogic } from "redux-logic";

import { getSelectedFiles } from "./selectors";
import { SELECT_FILE } from "./actions";
import { ReduxLogicDeps, ReduxLogicNextCb } from "../types";

/**
 * Interceptor responsible for transforming payload of SELECT_FILE actions to account for whether the intention is to
 * add to existing selected files state, or to replace existing selection state.
 */
const selectFile = createLogic({
    /**
     * Before hitting the reducer, determine whether we want to replace the existing state of selected files with the
     * new selection, OR, whether we want to append to the existing state.
     */
    transform(deps: ReduxLogicDeps, next: ReduxLogicNextCb) {
        const { action, getState } = deps;

        let selections;
        if (action.payload.append) {
            const existingSelections = getSelectedFiles(getState());
            selections = uniq([...existingSelections, ...castArray(action.payload.file)]);
        } else {
            selections = castArray(action.payload.file);
        }

        next({
            ...action,
            payload: {
                ...action.payload,
                file: selections,
            },
        });
    },
    type: SELECT_FILE,
});

export default [selectFile];
