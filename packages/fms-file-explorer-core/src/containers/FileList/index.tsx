import * as classNames from "classnames";
import { map } from "lodash";
import * as React from "react";
import { useSelector } from "react-redux";
import { VariableSizeList } from "react-window";

import FileRow from "../../components/FileRow";
import Row from "./Row";
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

    const [ref, containerHeight, containerWidth] = useLayoutMeasurements<HTMLDivElement>(); // eslint-disable-line @typescript-eslint/no-unused-vars
    const columns = React.useMemo(() => map(annotations, (annotation) => annotation.name), [
        annotations,
    ]);
    const [columnWidths, onResize, rowWidth] = useResizableColumns(containerWidth, columns);

    const headerCells = map(annotations, (annotation) => ({
        columnKey: annotation.name, // needs to match the value used to produce `column`s passed to the `useResizableColumns` hook
        displayValue: annotation.displayName,
        width: columnWidths.get(annotation.name),
    }));

    const fileSetTree = useSelector(fileListSelectors.getFileSetTree2);

    const listRef = React.useRef<VariableSizeList>(null);
    const [openState, toggleOpenState] = React.useState(() => new Map<number, boolean>());

    const toggleFileSetOpenState = React.useCallback(
        (index) => {
            toggleOpenState((prevOpenState) => {
                const nextOpenState = new Map(prevOpenState.entries());
                const prevState = nextOpenState.get(index);
                nextOpenState.set(index, !prevState);
                return nextOpenState;
            });
            if (listRef.current) {
                listRef.current.resetAfterIndex(index, false);
            }
        },
        [listRef]
    );

    const isOpen = React.useCallback(
        (index) => {
            const fileSetTreeNode = fileSetTree.get(index);
            if (fileSetTreeNode && fileSetTreeNode.dir === null) {
                return true;
            }
            return Boolean(openState.get(index));
        },
        [openState, fileSetTree]
    );

    React.useEffect(() => {
        if (listRef.current) {
            listRef.current.resetAfterIndex(0, false);
        }
    }, [fileSetTree, listRef]);

    return (
        <div className={classNames(styles.scrollContainer, props.className)}>
            <FileRow
                cells={headerCells}
                className={styles.header}
                onResize={onResize}
                rowWidth={rowWidth}
            />
            <div className={styles.fileTreeRoot} ref={ref}>
                <VariableSizeList
                    ref={listRef}
                    height={containerHeight}
                    itemCount={fileSetTree.size}
                    itemData={{
                        columnWidths,
                        displayAnnotations: annotations,
                        fileSetTree,
                        isOpen,
                        onClick: toggleFileSetOpenState,
                        rowWidth,
                    }}
                    itemSize={(index) => {
                        const node = fileSetTree.get(index);
                        if (node && node.hasOwnProperty("fileSet") && isOpen(index)) {
                            return 300;
                        }

                        return 35;
                    }}
                    width={rowWidth}
                >
                    {Row}
                </VariableSizeList>
            </div>
        </div>
    );
}
