import classNames from "classnames";
import * as React from "react";
import { ProgressIndicator } from "@fluentui/react";

import styles from "./RootLoadingIndicator.module.css";

interface LoadingIndicatorProps {
    visible: boolean;
}

export default function RootLoadingIndicator({ visible }: LoadingIndicatorProps) {
    return (
        <div className={classNames(styles.loadingIndicator, { [styles.hidden]: !visible })}>
            <ProgressIndicator
                className={styles.indeterminateProgressBar}
                progressHidden={!visible}
                styles={{
                    progressBar: { width: "100%" },
                }}
            />
        </div>
    );
}
