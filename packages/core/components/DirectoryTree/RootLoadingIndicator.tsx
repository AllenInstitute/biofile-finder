import { ProgressIndicator } from "@fluentui/react";
import classNames from "classnames";
import { isNil } from "lodash";
import * as React from "react";
import { useSelector } from "react-redux";

import annotationFormatterFactory, { AnnotationType } from "../../entity/AnnotationFormatter";
import { selection } from "../../state";

import styles from "./RootLoadingIndicator.module.css";

interface LoadingIndicatorProps {
    visible: boolean;
}

const numberFormatter = annotationFormatterFactory(AnnotationType.NUMBER);
const formatBytes = (bytes: number): string => numberFormatter.displayValue(bytes, "bytes");

/**
 * Overlay shown while the file list has nothing to show yet. When a data source is being prepared,
 * this reports which step it is on and — for sources whose size is knowable — how far through the
 * data it has read. Falls back to an indeterminate bar when there is no progress to report, which
 * is the case for work that isn't a data source load (e.g. paging through an open folder).
 */
export default function RootLoadingIndicator({ visible }: LoadingIndicatorProps) {
    const loadStatus = useSelector(selection.selectors.getDataSourceLoadStatus);

    // Append the known size of the read to the stage description.
    let progressDescription = loadStatus?.description;
    if (loadStatus && !isNil(loadStatus.bytesTotal)) {
        progressDescription = `${loadStatus.description} (${formatBytes(loadStatus.bytesTotal)})`;
    }

    return (
        <div
            className={classNames(styles.loadingIndicator, { [styles.hidden]: !visible })}
            data-testid="root-loading-indicator"
        >
            <ProgressIndicator
                className={classNames(styles.progressBar, {
                    [styles.indeterminateProgressBar]: isNil(loadStatus?.fraction),
                })}
                barHeight={6}
                description={progressDescription}
                percentComplete={loadStatus?.fraction}
                progressHidden={!visible}
                styles={{
                    progressBar: { width: "100%" },
                }}
            />
        </div>
    );
}
