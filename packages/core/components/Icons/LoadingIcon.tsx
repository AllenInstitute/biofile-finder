import { Spinner, SpinnerSize } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import styles from "./LoadingIcon.module.css";

interface Props {
    className?: string;
    invertColor?: boolean;
    highlightColor?: boolean;
    size?: SpinnerSize;

    "data-testid"?: string;
}

export default function LoadingIcon(props: Props) {
    return (
        <Spinner
            className={classNames(props.className, styles.spinner, {
                [styles.invertColor]: props.invertColor && !props.highlightColor,
                [styles.highlightColor]: props.highlightColor,
            })}
            size={props.size || SpinnerSize.small}
            data-testid={props["data-testid"]}
        />
    );
}
