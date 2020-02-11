import * as classNames from "classnames";
import * as React from "react";
import { ProgressIndicator } from "office-ui-fabric-react";

const styles = require("./RootLoadingIndicator.module.css");

interface LoadingIndicatorProps {
    height: number;
    visible: boolean;
}

export default function RootLoadingIndicator({ height, visible }: LoadingIndicatorProps) {
    return (
        <div
            className={classNames(styles.loadingIndicator, { [styles.hidden]: !visible })}
            style={{ height: `${height}px` }}
        >
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
