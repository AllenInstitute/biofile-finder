import * as classNames from "classnames";
import { map } from "lodash";
import * as React from "react";
import { useSelector } from "react-redux";

import FileRow from "../../components/FileRow";
import Directory from "./Directory";
import * as fileListSelectors from "./selectors";
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

    const fileSetTree = useSelector(fileListSelectors.getFileSetTree);
    return (
        <div className={classNames(styles.scrollContainer, props.className)}>
            <FileRow
                cells={headerCells}
                className={styles.header}
                onResize={onResize}
                rowWidth={rowWidth}
            />
            <div className={styles.fileTreeRoot} ref={ref}>
                {map(fileSetTree, (subTree) => {
                    const [directoryName] = subTree;
                    return (
                        <Directory
                            key={String(directoryName)}
                            columnWidths={columnWidths}
                            displayAnnotations={annotations}
                            rowWidth={rowWidth}
                            fileSetTree={subTree}
                        />
                    );
                })}
            </div>
        </div>
    );
}
