import * as classNames from "classnames";
import { map } from "lodash";
import * as React from "react";
import { useSelector } from "react-redux";

import FileRow from "../../components/FileRow";
import LazyWindowedFileList from "../../components/LazyWindowedFileList";
import { selection } from "../../state";
import useLayoutMeasurements from "../../hooks/useLayoutMeasurements";
import useResizableColumns from "./useResizableColumns";

const styles = require("./FileList.module.css");

interface FileListProps {
    className?: string;
}

/**
 * Central UI dedicated to showing lists of available files in FMS. Can be a flat list in the case that no annotation
 * hierarchies have been applied, or nested in the case that the user has declared how (i.e., by which annotations) the
 * files should be grouped.
 */
export default function FileList(props: FileListProps) {
    const annotations = useSelector(selection.selectors.getAnnotationsToDisplay);

    const [ref, _, containerWidth] = useLayoutMeasurements<HTMLDivElement>(); // eslint-disable-line @typescript-eslint/no-unused-vars
    const columns = React.useMemo(() => map(annotations, (annotation) => annotation.name), [
        annotations,
    ]);
    const [columnWidths, onResize, rowWidth] = useResizableColumns(containerWidth, columns);

    const headerCells = map(annotations, (annotation) => ({
        columnKey: annotation.name, // needs to match the value used to produce `column`s passed to the `useResizableColumns` hook
        displayValue: annotation.displayName,
        width: columnWidths.get(annotation.name),
    }));

    return (
        <div className={classNames(styles.root, props.className)} ref={ref}>
            <FileRow
                cells={headerCells}
                className={styles.header}
                onResize={onResize}
                rowWidth={rowWidth}
            />
            <LazyWindowedFileList
                columnWidths={columnWidths}
                className={styles.list}
                displayAnnotations={annotations}
                rowWidth={rowWidth}
            />
        </div>
    );
}
