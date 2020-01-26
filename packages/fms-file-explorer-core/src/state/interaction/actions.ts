import { makeConstant } from "@aics/redux-utils";

import { ContextMenuItem } from "../../containers/ContextMenu";

const STATE_BRANCH_NAME = "interaction";

/**
 * SHOW_CONTEXT_MENU
 *
 * Intention to show context menu.
 */
export const SHOW_CONTEXT_MENU = makeConstant(STATE_BRANCH_NAME, "show-context-menu");

export interface ShowContextMenuAction {
    type: string;
    payload: ContextMenuItem[];
}

export function showContextMenu(items: ContextMenuItem[]): ShowContextMenuAction {
    return {
        type: SHOW_CONTEXT_MENU,
        payload: items,
    };
}

/**
 * HIDE_CONTEXT_MENU
 *
 * Intention to hide context menu.
 */
export const HIDE_CONTEXT_MENU = makeConstant(STATE_BRANCH_NAME, "hide-context-menu");

export interface HideContextMenuAction {
    type: string;
}

export function hideContextMenu(): HideContextMenuAction {
    return {
        type: HIDE_CONTEXT_MENU,
    };
}
