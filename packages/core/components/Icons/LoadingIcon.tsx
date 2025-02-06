import { Spinner, SpinnerSize } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import styles from "./LoadingIcon.module.css";

interface Props {
    className?: string;
    invertColor?: boolean;
    size?: SpinnerSize;
}

export default function LoadingIcon(props: Props) {
    return (
        <Spinner
            className={classNames(props.className, styles.spinner, {
                [styles.invertColor]: props.invertColor,
            })}
            size={props.size || SpinnerSize.small}
        />
    );
}
