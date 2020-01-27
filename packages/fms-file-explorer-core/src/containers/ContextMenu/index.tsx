import { ContextualMenu, IContextualMenuItem, Target } from "office-ui-fabric-react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction } from "../../state";

export type ContextMenuItem = IContextualMenuItem;
export type PositionReference = Target;

export default function ContextMenu() {
    const visible = useSelector(interaction.selectors.getContextMenuVisibility);
    const items = useSelector(interaction.selectors.getContextMenuItems);
    const positionReference = useSelector(interaction.selectors.getContextMenuPositionReference);
    const dispatch = useDispatch();

    return (
        <ContextualMenu
            items={items}
            hidden={!visible}
            target={positionReference}
            onDismiss={() => dispatch(interaction.actions.hideContextMenu())}
        />
    );
}
