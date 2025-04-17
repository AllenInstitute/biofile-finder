/**
 * State management for DirectoryHierarchy nodes. Each node in the hierarchy has this state.
 *
 * Particular values of state are coordinated. For example, if content has successfully loaded and is ready to be stored,
 * the loading indicator and any previous error, if any, should be cleared. The reducer in this module encapsulates that logic.
 */

export interface State {
    // Rendered as `children` for the node this state belongs to.
    // Will be either either DirectoryHierarchyNodes or a FileList.
    content: JSX.Element | JSX.Element[] | null;

    // Is the content for this node currently loading?
    isLoading: boolean;

    // Was an error encountered loading the content for this node?
    error: Error | null;
}

/**
 * Action constants
 */
enum DirectoryHierarchyAction {
    ERROR = "error",
    RECEIVE_CONTENT = "receive-content",
    SHOW_LOADING_INDICATOR = "show-loading-indicator",
}

/**
 * Special node types
 * Defined here to avoid circular dependencies
 */
export const ROOT_NODE = "root_node_sentinel_value";
export const NO_VALUE_NODE = "no_value_node";

/**
 * Interface for an action the reducer will respond to. See below for action creators.
 */
export interface Action {
    payload?: any;
    type: DirectoryHierarchyAction;
}

/**
 * State reducer. Given an action (i.e., an intention), return new state for a particular node
 * in the directory hierarchy.
 */
export function reducer(state: State, action: Action): State {
    switch (action.type) {
        case DirectoryHierarchyAction.ERROR:
            return {
                ...state,
                error: action.payload.error,
                isLoading: false,
            };
        case DirectoryHierarchyAction.RECEIVE_CONTENT:
            return {
                ...state,
                content: action.payload?.content,
                error: null,
                isLoading: false,
            };
        case DirectoryHierarchyAction.SHOW_LOADING_INDICATOR:
            return {
                ...state,
                isLoading: true,
            };
        default:
            return state;
    }
}

export const INITIAL_STATE: State = {
    content: null,
    isLoading: false,
    error: null,
};

/**
 * Action creators
 */
export function setError(err: Error, isRoot: boolean): Action {
    return {
        type: DirectoryHierarchyAction.ERROR,
        payload: {
            error: err,
            isRoot,
        },
    };
}

export function receiveContent(content: JSX.Element | JSX.Element[]): Action {
    return {
        type: DirectoryHierarchyAction.RECEIVE_CONTENT,
        payload: {
            content,
        },
    };
}

export function showLoadingIndicator(): Action {
    return {
        type: DirectoryHierarchyAction.SHOW_LOADING_INDICATOR,
    };
}
