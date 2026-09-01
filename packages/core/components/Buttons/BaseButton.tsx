import { DefaultButton, DirectionalHint, IContextualMenuItem, Icon } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import useButtonMenu from "./useButtonMenu";
import Tooltip from "../Tooltip";

import styles from "./BaseButton.module.css";

interface Props {
    ariaLabel?: string;
    className?: string;
    disabled?: boolean;
    iconName?: string;
    iconPosition?: "before" | "after";
    id?: string;
    isSelected?: boolean;
    menuDirection?: DirectionalHint;
    menuIconName?: string;
    menuItems?: IContextualMenuItem[];
    onClick?: () => void;
    text?: string;
    title?: string;
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

    const isIconAfter = props.iconPosition === "after";
    const icon = props.iconName && (
        <Icon
            className={classNames(styles.buttonIcon, {
                [styles.padRight]: !!props.text && !isIconAfter,
                [styles.padLeft]: !!props.text && isIconAfter,
            })}
            iconName={props.iconName}
        />
    );
    const content = (
        <span className={styles.buttonContent}>
            {!isIconAfter && icon}
            <span className={styles.buttonText}>
                {props?.useSentenceCase ? props.text : props.text?.toUpperCase()}
            </span>
            {isIconAfter && icon}
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
                ariaLabel={props.ariaLabel ?? props.title}
                disabled={props.disabled}
                id={props.id}
                menuIconProps={
                    props.menuIconName
                        ? { iconName: props.menuIconName, className: styles.buttonIcon }
                        : { className: styles.hidden }
                }
                menuProps={styledMenu}
                onClick={props.onClick}
            >
                {content}
            </DefaultButton>
        </Tooltip>
    );
}
