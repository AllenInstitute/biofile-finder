import { ContextualMenu, IContextualMenuItem, Target } from "office-ui-fabric-react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction } from "../../state";

export type ContextMenuItem = IContextualMenuItem;

interface ContextMenuProps {
    /**
     * Passed to `ContextualMenu` as `target`. From the docs:
     * "The target that ContextualMenu should try to position itself based on.
     * It can be either an element, a query selector string resolving to a valid element, or a MouseEvent.
     * If a MouseEvent is given, the origin point of the event will be used."
     */
    positionBy?: Target;
    items: IContextualMenuItem[];
}

export default function ContextMenu(props: ContextMenuProps) {
    const { positionBy, items } = props;
    const visible = useSelector(interaction.selectors.getContextMenuVisibility);
    const dispatch = useDispatch();

    return (
        <ContextualMenu
            items={items}
            hidden={!visible}
            target={positionBy}
            onDismiss={() => dispatch(interaction.actions.hideContextMenu())}
        />
    );
}
