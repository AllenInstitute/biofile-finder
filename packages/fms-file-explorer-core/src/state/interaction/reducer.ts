import { makeReducer } from "@aics/redux-utils";

import {
    SHOW_CONTEXT_MENU,
    HIDE_CONTEXT_MENU,
    SET_FILE_EXPLORER_SERVICE_BASE_URL,
} from "./actions";
import { ContextMenuItem, PositionReference } from "../../containers/ContextMenu";
import { DEFAULT_CONNECTION_CONFIG } from "../../services/HttpServiceBase";

export interface InteractionStateBranch {
    contextMenuIsVisible: boolean;
    contextMenuItems: ContextMenuItem[];
    contextMenuPositionReference: PositionReference;
    fileExplorerServiceBaseUrl: string;
}

export const initialState = {
    contextMenuIsVisible: false,
    contextMenuItems: [],
    // Passed to `ContextualMenu` as `target`. From the "office-ui-fabric-react" docs:
    // "The target that ContextualMenu should try to position itself based on.
    // It can be either an element, a query selector string resolving to a valid element, or a MouseEvent.
    // If a MouseEvent is given, the origin point of the event will be used."
    contextMenuPositionReference: null,
    fileExplorerServiceBaseUrl: DEFAULT_CONNECTION_CONFIG.baseUrl,
};

export default makeReducer<InteractionStateBranch>(
    {
        [SHOW_CONTEXT_MENU]: (state, action) => ({
            ...state,
            contextMenuIsVisible: true,
            contextMenuItems: action.payload.items,
            contextMenuPositionReference: action.payload.positionReference,
        }),
        [HIDE_CONTEXT_MENU]: (state) => ({
            ...state,
            contextMenuIsVisible: false,
        }),
        [SET_FILE_EXPLORER_SERVICE_BASE_URL]: (state, action) => ({
            ...state,
            fileExplorerServiceBaseUrl: action.payload,
        }),
    },
    initialState
);
