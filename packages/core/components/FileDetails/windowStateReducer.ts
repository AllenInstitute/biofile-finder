import { WindowAction } from "../../components/WindowActionButton";

export enum WindowState {
    DEFAULT,
    MINIMIZED,
    MAXIMIZED,
}

export const INITIAL_STATE = {
    state: WindowState.DEFAULT,
    possibleActions: [WindowAction.MINIMIZE, WindowAction.MAXIMIZE],
};

type State = { state: WindowState; possibleActions: WindowAction[] };
type Action = { type: WindowAction };

/**
 * Small state machine to manage the "window state" of the details pane. Window state can be:
 * - MINIMIZED, in which case we need to be able to:
 *      - restore it to its default size
 *      - maximize it
 * - MAXIMIZED, in which case we need to be able to:
 *      - restore it to its default size
 *      - minimize it
 * - DEFAULT, in which case we need to be able to:
 *      - minimize it
 *      - maximize it
 */
export default function windowStateReducer(state: State, action: Action): State {
    switch (action.type) {
        case WindowAction.MINIMIZE:
            return {
                state: WindowState.MINIMIZED,
                possibleActions: [WindowAction.RESTORE, WindowAction.MAXIMIZE],
            };
        case WindowAction.MAXIMIZE:
            return {
                state: WindowState.MAXIMIZED,
                possibleActions: [WindowAction.MINIMIZE, WindowAction.RESTORE],
            };
        case WindowAction.RESTORE:
        // prettier-ignore
        default: // FALL THROUGH
            return INITIAL_STATE;
    }
}
