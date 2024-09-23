import { DirectionalHint, IContextualMenuItem } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import BaseButton from "./BaseButton";

import styles from "./TertiaryButton.module.css";

interface Props {
    className?: string;
    disabled?: boolean;
    iconName: string;
    id?: string;
    isSelected?: boolean;
    menuDirection?: DirectionalHint;
    menuItems?: IContextualMenuItem[];
    onClick?: () => void;
    invertColor?: boolean;
    title: string;
}

/**
 * Component styled for tertiary interactions in the app (ex. font size buttons)
 */
export default function TertiaryButton(props: Props) {
    return (
        <BaseButton
            className={classNames(props.className, styles.button, {
                [styles.disabled]: props.disabled,
                [styles.inverted]: props.invertColor,
                [styles.selected]: props.isSelected,
            })}
            disabled={props.disabled}
            iconName={props.iconName}
            id={props.id}
            isSelected={props.isSelected}
            menuDirection={props.menuDirection}
            menuItems={props.menuItems}
            onClick={props.onClick}
            title={props.title}
        />
    );
}
