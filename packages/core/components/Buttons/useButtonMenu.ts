import { ContextualMenuItemType, IContextualMenuItem, IContextualMenuProps } from "@fluentui/react";
import { noop } from "lodash";
import * as React from "react";

import styles from "./useButtonMenu.module.css";

function normalizeButtonMenuItem(item: IContextualMenuItem): IContextualMenuItem {
    let className = item.className;

    if (item.itemType === ContextualMenuItemType.Header) {
        className = styles.buttonMenuHeader;
    }

    if (item.disabled) {
        className = styles.buttonMenuItemDisabled;
    }

    return {
        ...item,
        className,
        subMenuProps: item.subMenuProps
            ? normalizeButtonMenu({ ...item.subMenuProps, isSubMenu: true })
            : undefined,
    };
}

function normalizeButtonMenu(menu: IContextualMenuProps): IContextualMenuProps {
    return {
        ...menu,
        shouldFocusOnMount: true,
        className: styles.buttonMenu,
        calloutProps: { className: styles.buttonMenuCallout },
        items: menu.items.map((item) => normalizeButtonMenuItem(item)),
        onRestoreFocus: noop, // Prevent button from refocusing on menu close
    };
}

export default function useButtonMenu(
    menu: Partial<IContextualMenuProps>
): IContextualMenuProps | undefined {
    return React.useMemo(
        () => (menu.items ? normalizeButtonMenu(menu as IContextualMenuProps) : undefined),
        [menu]
    );
}
