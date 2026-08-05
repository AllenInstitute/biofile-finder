import { DefaultButton, DirectionalHint, IContextualMenuItem, Icon } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import useButtonMenu from "./useButtonMenu";
import Tooltip from "../Tooltip";

import styles from "./BaseButton.module.css";

interface Props {
    // Accessible name when no tooltip is wanted. `title` also sets the
    // accessible name but additionally shows a tooltip; use `ariaLabel` to
    // name the button (e.g. an icon-only button) without a tooltip.
    ariaLabel?: string;
    className?: string;
    disabled?: boolean;
    iconName?: string;
    // Which side of the text the icon sits on. Defaults to "before" (the icon
    // leads the text), preserving existing call sites.
    iconPosition?: "before" | "after";
    id?: string;
    isSelected?: boolean;
    menuDirection?: DirectionalHint;
    // Optional Fluent icon name for the trailing menu chevron. When omitted the
    // chevron stays hidden (the app's default), preserving existing call sites.
    menuIconName?: string;
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

    const iconAfter = props.iconPosition === "after";
    const icon = props.iconName && (
        <Icon
            className={classNames(styles.buttonIcon, {
                [styles.padRight]: !!props.text && !iconAfter,
                [styles.padLeft]: !!props.text && iconAfter,
            })}
            iconName={props.iconName}
        />
    );
    const content = (
        <span className={styles.buttonContent}>
            {!iconAfter && icon}
            <span className={styles.buttonText}>
                {props?.useSentenceCase ? props.text : props.text?.toUpperCase()}
            </span>
            {iconAfter && icon}
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
                        ? // Match the weight/styling of the button's leading/trailing icons.
                          { iconName: props.menuIconName, className: styles.buttonIcon }
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
