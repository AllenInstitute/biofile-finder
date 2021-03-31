import classNames from "classnames";
import debouncePromise from "debounce-promise";
import { defaults, isFunction } from "lodash";
import * as React from "react";
import { useSelector } from "react-redux";
import { FixedSizeList } from "react-window";
import InfiniteLoader from "react-window-infinite-loader";

import FileSet from "../../entity/FileSet";
import Header from "./Header";
import LazilyRenderedRow from "./LazilyRenderedRow";
import { selection } from "../../state";
import useLayoutMeasurements from "../../hooks/useLayoutMeasurements";
import useFileSelector from "./useFileSelector";
import useFileAccessContextMenu from "./useFileAccessContextMenu";

const styles = require("./FileList.module.css");

const DEBOUNCE_WAIT_FOR_DATA_FETCHING = 50; // ms

// This is an arbitrary value that needs to be set to some number > 0 in order to prompt react-window-infinite-loader
// to start calling `loadMoreItems`.
const DEFAULT_TOTAL_COUNT = 1000;

interface FileListProps {
    className?: string;
    fileSet: FileSet;
    isRoot: boolean;
    rowHeight?: number; // how tall each row of the list will be, in px
    sortOrder: number;
    totalCount?: number;
}

const DEFAULTS = {
    totalCount: DEFAULT_TOTAL_COUNT,
    rowHeight: 22,
};

const MAX_NON_ROOT_HEIGHT = 300;

/**
 * Wrapper for react-window-infinite-loader and react-window that knows how to lazily fetch its own data. It will lay
 * itself out to be 100% the height and width of its parent.
 */
export default function FileList(props: FileListProps) {
    const { className, fileSet, isRoot, rowHeight, sortOrder, totalCount } = defaults(
        {},
        props,
        DEFAULTS
    );

    const onSelect = useFileSelector(fileSet, sortOrder);
    const fileSelection = useSelector(selection.selectors.getFileSelection);

    // Callback provided to individual LazilyRenderedRows to be called on `contextmenu`
    const onFileRowContextMenu = useFileAccessContextMenu();

    // If this is the "root" file list (e.g., all files in FMS), this component should take up
    // 100% of the height of its container.
    // Otherwise, the height of the list should reflect the number of items it has to render, up to
    // a certain maximum.
    const [measuredNodeRef, measuredHeight, measuredWidth] = useLayoutMeasurements<
        HTMLDivElement
    >();
    const dataDrivenHeight = rowHeight * totalCount + 3 * rowHeight; // adding three additional rowHeights leaves room for the header + horz. scroll bar
    const calculatedHeight = Math.min(MAX_NON_ROOT_HEIGHT, dataDrivenHeight);
    const height = isRoot ? measuredHeight : calculatedHeight;

    const listRef = React.useRef<FixedSizeList | null>(null);
    const outerRef = React.useRef<HTMLDivElement | null>(null);

    // This hook is responsible for ensuring that if the details pane is currently showing a file row
    // within this FileList the file row shown in the details pane is scrolled into view.
    React.useEffect(() => {
        if (listRef.current && outerRef.current && fileSelection.isFocused(fileSet)) {
            const { indexWithinFileSet } = fileSelection.getFocusedItemIndices();
            if (indexWithinFileSet !== undefined) {
                const listScrollTop = outerRef.current.scrollTop;
                const focusedItemTop = indexWithinFileSet * rowHeight;
                const focusedItemBottom = focusedItemTop + rowHeight;
                const headerHeight = 40; // px; defined in Header.module.css; stickily sits on top of the list
                const visibleArea = height - headerHeight;
                const focusedItemIsVisible =
                    focusedItemTop >= listScrollTop &&
                    focusedItemBottom <= listScrollTop + visibleArea;

                if (!focusedItemIsVisible) {
                    const centerOfFocusedItem = focusedItemTop + rowHeight / 2;
                    const centeredWithinVisibleArea = Math.floor(
                        centerOfFocusedItem - visibleArea / 2
                    );
                    listRef.current.scrollTo(Math.max(0, centeredWithinVisibleArea));
                }
            }
        }
    }, [fileSelection, fileSet, height, rowHeight]);

    return (
        <div className={classNames(styles.container, className)}>
            <div
                className={classNames(styles.list)}
                style={{
                    height: isRoot ? undefined : `${calculatedHeight}px`,
                }}
                ref={measuredNodeRef}
            >
                <InfiniteLoader
                    key={fileSet.instanceId} // force a re-render whenever FileSet changes
                    isItemLoaded={fileSet.isFileMetadataLoaded}
                    loadMoreItems={debouncePromise(
                        fileSet.fetchFileRange,
                        DEBOUNCE_WAIT_FOR_DATA_FETCHING
                    )}
                    itemCount={totalCount}
                >
                    {({ onItemsRendered, ref: innerRef }) => {
                        const callbackRef = (instance: FixedSizeList | null) => {
                            listRef.current = instance;

                            // react-window-infinite-loader takes a reference to the List component instance:
                            // https://github.com/bvaughn/react-window-infinite-loader/blob/571f6c37b692d2e01bd3b762cdc93ca7c8f7ebf3/src/InfiniteLoader.js#L103-L105
                            if (isFunction(innerRef)) {
                                innerRef(instance);
                            }
                        };

                        return (
                            <FixedSizeList
                                itemData={{
                                    fileSet: fileSet,
                                    onSelect,
                                    onContextMenu: onFileRowContextMenu,
                                }}
                                itemSize={rowHeight} // row height
                                height={height} // height of the list itself; affects number of rows rendered at any given time
                                itemCount={totalCount}
                                onItemsRendered={onItemsRendered}
                                outerElementType={Header}
                                outerRef={outerRef}
                                ref={callbackRef}
                                width={measuredWidth}
                            >
                                {LazilyRenderedRow}
                            </FixedSizeList>
                        );
                    }}
                </InfiniteLoader>
            </div>
            <p className={styles.rowCountDisplay}>{totalCount} files</p>
        </div>
    );
}
