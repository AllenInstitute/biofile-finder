import { makeReducer } from "@aics/redux-utils";

import { SHOW_CONTEXT_MENU, HIDE_CONTEXT_MENU } from "./actions";
import { ContextMenuItem } from "../../containers/ContextMenu";

export interface InteractionStateBranch {
    contextMenuIsVisible: boolean;
    contextMenuItems: ContextMenuItem[];
}

export const initialState = {
    contextMenuIsVisible: false,
    contextMenuItems: [],
};

export default makeReducer<InteractionStateBranch>(
    {
        [SHOW_CONTEXT_MENU]: (state, action) => ({
            ...state,
            contextMenuIsVisible: true,
            contextMenuItems: action.payload,
        }),
        [HIDE_CONTEXT_MENU]: (state) => ({
            ...state,
            contextMenuIsVisible: false,
        }),
    },
    initialState
);
