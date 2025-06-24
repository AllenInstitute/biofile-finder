import classNames from "classnames";
import * as React from "react";

import BaseButton from "./BaseButton";

import styles from "./LinkLikeButton.module.css";

interface Props {
    className?: string;
    disabled?: boolean;
    iconName?: string;
    id?: string;
    onClick?: () => void;
    text?: string;
    title?: string;
}

/**
 * Component styled for buttons that look like links
 */
export default function LinkLikeButton(props: Props) {
    return (
        <BaseButton
            className={classNames(props.className, styles.button, {
                [styles.disabled]: props.disabled,
            })}
            disabled={props.disabled}
            iconName={props.iconName}
            id={props.id}
            onClick={props.onClick}
            text={props.text}
            title={props.title}
            useSentenceCase
        />
    );
}
