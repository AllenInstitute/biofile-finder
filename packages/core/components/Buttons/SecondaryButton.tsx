import { DirectionalHint, IContextualMenuItem } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import BaseButton from "./BaseButton";

import styles from "./SecondaryButton.module.css";

interface Props {
    className?: string;
    disabled?: boolean;
    iconName?: string;
    id?: string;
    menuDirection?: DirectionalHint;
    menuItems?: IContextualMenuItem[];
    onClick?: () => void;
    text?: string;
    title?: string;
}

/**
 * Component styled for secondary interactions in the app (ex. GET STARTED)
 */
export default function SecondaryButton(props: Props) {
    return (
        <BaseButton
            className={classNames(props.className, styles.button, {
                [styles.disabled]: props.disabled,
            })}
            disabled={props.disabled}
            iconName={props.iconName}
            id={props.id}
            menuDirection={props.menuDirection}
            menuItems={props.menuItems}
            onClick={props.onClick}
            text={props.text}
            title={props.title}
        />
    );
}
