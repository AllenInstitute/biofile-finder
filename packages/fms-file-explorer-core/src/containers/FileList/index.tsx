import * as classNames from "classnames";
import * as React from "react";
import { useSelector } from "react-redux";
import { VariableSizeList } from "react-window";

import Row from "./Row";
import * as fileListSelectors from "./selectors";
import useLayoutMeasurements from "../../hooks/useLayoutMeasurements";

interface FileListProps {
    className?: string;
}

/**
 * Central UI dedicated to showing lists of available files in FMS. Can be a flat list in the case that no annotation
 * hierarchies have been applied, or nested in the case that the user has declared how (i.e., by which annotations) the
 * files should be grouped.
 */
export default function FileList(props: FileListProps) {
    const [ref, containerHeight] = useLayoutMeasurements<HTMLDivElement>(); // eslint-disable-line @typescript-eslint/no-unused-vars

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
        <div className={classNames(props.className)} ref={ref}>
            <VariableSizeList
                ref={listRef}
                height={containerHeight}
                itemCount={fileSetTree.size}
                itemData={{
                    fileSetTree,
                    isOpen,
                    onClick: toggleFileSetOpenState,
                }}
                itemSize={(index) => {
                    const node = fileSetTree.get(index);
                    if (node && node.isRoot) {
                        return containerHeight;
                    }

                    if (node && node.hasOwnProperty("fileSet") && isOpen(index)) {
                        return 300; // TODO
                    }

                    return 35; // TODO
                }}
                width="100%"
            >
                {Row}
            </VariableSizeList>
        </div>
    );
}
