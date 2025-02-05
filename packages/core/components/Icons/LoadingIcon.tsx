import { Spinner, SpinnerSize } from "@fluentui/react";
import * as React from "react";

import styles from "./LoadingIcon.module.css";

interface Props {
    size?: SpinnerSize;
    testId?: string;
}

export default function LoadingIcon(props: Props) {
    return (
        <Spinner
            className={styles.spinner}
            data-testid={props.testId}
            size={props.size || SpinnerSize.small}
        />
    );
}
