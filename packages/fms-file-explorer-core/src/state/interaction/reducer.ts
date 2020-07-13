import { makeReducer } from "@aics/redux-utils";
import { filter } from "lodash";

import {
    SHOW_CONTEXT_MENU,
    HIDE_CONTEXT_MENU,
    PlatformDependentServices,
    SET_FILE_EXPLORER_SERVICE_BASE_URL,
    SET_PLATFORM_DEPENDENT_SERVICES,
    StatusUpdate,
    MANIFEST_DOWNLOAD_START,
    MANIFEST_DOWNLOAD_SUCCESS,
    MANIFEST_DOWNLOAD_FAILURE,
    CLEAR_STATUS,
} from "./actions";
import { ContextMenuItem, PositionReference } from "../../containers/ContextMenu";
import FileDownloadServiceNoop from "../../services/FileDownloadService/FileDownloadServiceNoop";
import { DEFAULT_CONNECTION_CONFIG } from "../../services/HttpServiceBase";

export interface InteractionStateBranch {
    contextMenuIsVisible: boolean;
    contextMenuItems: ContextMenuItem[];
    contextMenuPositionReference: PositionReference;
    fileExplorerServiceBaseUrl: string;
    platformDependentServices: PlatformDependentServices;
    status: StatusUpdate[];
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
    platformDependentServices: {
        fileDownloadService: new FileDownloadServiceNoop(),
    },
    status: [],
};

export default makeReducer<InteractionStateBranch>(
    {
        [SHOW_CONTEXT_MENU]: (state, action) => ({
            ...state,
            contextMenuIsVisible: true,
            contextMenuItems: action.payload.items,
            contextMenuPositionReference: action.payload.positionReference,
        }),
        [CLEAR_STATUS]: (state, action) => ({
            ...state,
            status: filter(state.status, (status: StatusUpdate) => status.id !== action.payload.id),
        }),
        [HIDE_CONTEXT_MENU]: (state) => ({
            ...state,
            contextMenuIsVisible: false,
        }),
        [MANIFEST_DOWNLOAD_START]: (state, action) => ({
            ...state,
            status: [
                ...filter(state.status, (status: StatusUpdate) => status.id !== action.payload.id),
                action.payload,
            ],
        }),
        [MANIFEST_DOWNLOAD_SUCCESS]: (state, action) => ({
            ...state,
            status: [
                ...filter(state.status, (status: StatusUpdate) => status.id !== action.payload.id),
                action.payload,
            ],
        }),
        [MANIFEST_DOWNLOAD_FAILURE]: (state, action) => ({
            ...state,
            status: [
                ...filter(state.status, (status: StatusUpdate) => status.id !== action.payload.id),
                action.payload,
            ],
        }),
        [SET_FILE_EXPLORER_SERVICE_BASE_URL]: (state, action) => ({
            ...state,
            fileExplorerServiceBaseUrl: action.payload,
        }),
        [SET_PLATFORM_DEPENDENT_SERVICES]: (state, action) => ({
            ...state,
            platformDependentServices: action.payload,
        }),
    },
    initialState
);
