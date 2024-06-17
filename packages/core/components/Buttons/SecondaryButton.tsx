import { DefaultButton, Icon } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import styles from "./SecondaryButton.module.css";

interface Props {
    className?: string;
    disabled?: boolean;
    iconName?: string;
    id?: string;
    onClick?: () => void;
    text?: string;
    title: string;
}

/**
 * Component styled for secondary interactions in the app (ex. GET STARTED)
 */
export default function SecondaryButton(props: Props) {
    const content = (
        <span className={styles.buttonContent}>
            {props.iconName && <Icon className={styles.buttonIcon} iconName={props.iconName} />}
            <span className={styles.buttonText}>{props.text?.toUpperCase()}</span>
        </span>
    );

    // Avoid button element wrapper if not necessary
    if (!props.onClick) {
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
            onClick={props.onClick}
            title={props.title}
        >
            {content}
        </DefaultButton>
    );
}
