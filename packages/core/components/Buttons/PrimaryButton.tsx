import { ContextualMenuItemType, DefaultButton, IContextualMenuItem, Icon } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import styles from "./PrimaryButton.module.css";

interface Props {
    className?: string;
    disabled?: boolean;
    iconName: string;
    id?: string;
    menuItems?: IContextualMenuItem[];
    onClick?: () => void;
    text?: string;
    title: string;
}

/**
 * Component styled for primary interactions in the app (ex. Download)
 */
export default function PrimaryButton(props: Props) {
    const styledMenuItems = React.useMemo(
        () =>
            props.menuItems
                ? props.menuItems.map((menuItem) => {
                      if (menuItem.itemType === ContextualMenuItemType.Divider) {
                          return {
                              ...menuItem,
                              className: styles.buttonMenuDivider,
                          };
                      }

                      if (menuItem.itemType === ContextualMenuItemType.Header) {
                          console.log("did the header", menuItem);
                          return {
                              ...menuItem,
                              className: styles.buttonMenuHeader,
                          };
                      }

                      return menuItem;
                  })
                : undefined,
        [props.menuItems]
    );

    const content = (
        <span className={styles.buttonContent}>
            <Icon className={styles.buttonIcon} iconName={props.iconName} />
            <span className={styles.buttonText}>{props.text?.toUpperCase()}</span>
        </span>
    );

    // Avoid button element wrapper if not necessary
    if (!props.onClick && !props.menuItems) {
        return (
            <div
                className={classNames(props.className, styles.button)}
                id={props.id}
                title={props.title}
            >
                {content}
            </div>
        );
    }

    return (
        <DefaultButton
            className={classNames(props.className, styles.button)}
            ariaLabel={props.title}
            disabled={props.disabled}
            id={props.id}
            menuIconProps={{ className: styles.hidden }}
            menuProps={
                styledMenuItems
                    ? {
                          className: styles.buttonMenu,
                          calloutProps: { className: styles.buttonMenuCallout },
                          // TODO
                          // directionalHint: DirectionalHint.rightTopEdge,
                          shouldFocusOnMount: true,
                          items: styledMenuItems,
                      }
                    : undefined
            }
            onClick={props.onClick}
            title={props.title}
        >
            {content}
        </DefaultButton>
    );
}
