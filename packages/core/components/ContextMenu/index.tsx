import {
    ContextualMenu,
    IContextualMenuItem,
    Target,
    ContextualMenuItemType as _ContextualMenuItemType,
} from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { useButtonMenu } from "../Buttons";
import { interaction } from "../../state";

export type ContextMenuItem = IContextualMenuItem;
export type PositionReference = Target;
export const ContextualMenuItemType = _ContextualMenuItemType;

/**
 * Facade for @fluentui/react's ContextualMenu component. Rendered in response to `contextmenu` events (e.g., right-clicks).
 * On dismiss, it will hide itself.
 */
export default function ContextMenu() {
    const dispatch = useDispatch();
    const selectedItems = useSelector(interaction.selectors.getContextMenuItems);
    const positionReference = useSelector(interaction.selectors.getContextMenuPositionReference);
    const visible = useSelector(interaction.selectors.getContextMenuVisibility);
    const optionalOnMenuDismiss = useSelector(interaction.selectors.getContextMenuOnDismiss);
    const onDismiss = () => {
        optionalOnMenuDismiss && optionalOnMenuDismiss();
        dispatch(interaction.actions.hideContextMenu());
    };

    const contextMenuStyling = useButtonMenu({ items: selectedItems });

    if (!contextMenuStyling) {
        return null;
    }

    return (
        <ContextualMenu
            {...contextMenuStyling}
            hidden={!visible}
            onDismiss={onDismiss}
            target={positionReference}
        />
    );
}
