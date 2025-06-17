import { DefaultButton, DirectionalHint, IContextualMenuItem, Icon } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import useButtonMenu from "./useButtonMenu";
import Tooltip from "../Tooltip";

import styles from "./BaseButton.module.css";

interface Props {
    className?: string;
    disabled?: boolean;
    iconName?: string;
    id?: string;
    isSelected?: boolean;
    menuDirection?: DirectionalHint;
    menuItems?: IContextualMenuItem[];
    onClick?: () => void;
    text?: string;
    // title is only required if tooltip would be different from button text
    // or if button does not have text (e.g., icon only)
    title?: string;
    // default to all-caps except for link-like buttons
    useSentenceCase?: boolean;
}

/**
 * Component styled for generic interactions in the app intended to be
 * used as a base for more styled components
 */
export default function BaseButton(props: Props) {
    const styledMenu = useButtonMenu({
        items: props.menuItems,
        directionalHint: props.menuDirection,
    });

    const content = (
        <span className={styles.buttonContent}>
            {props.iconName && (
                <Icon
                    className={classNames(styles.buttonIcon, { [styles.padRight]: !!props.text })}
                    iconName={props.iconName}
                />
            )}
            <span className={styles.buttonText}>
                {props?.useSentenceCase ? props.text : props.text?.toUpperCase()}
            </span>
        </span>
    );

    // Avoid button element wrapper if not necessary
    if (!props.onClick && !props.menuItems) {
        return (
            <Tooltip content={props.title} disabled={props.disabled}>
                <div className={classNames(props.className, styles.button)} id={props.id}>
                    {content}
                </div>
            </Tooltip>
        );
    }

    return (
        <Tooltip content={props.title} disabled={props.disabled}>
            <DefaultButton
                className={classNames(props.className, styles.button, {
                    [styles.disabled]: props.disabled,
                    [styles.selected]: props.isSelected,
                })}
                data-testid={`base-button-${props.id}`}
                ariaLabel={props.title}
                disabled={props.disabled}
                id={props.id}
                menuIconProps={{ className: styles.hidden }}
                menuProps={styledMenu}
                onClick={props.onClick}
            >
                {content}
            </DefaultButton>
        </Tooltip>
    );
}
