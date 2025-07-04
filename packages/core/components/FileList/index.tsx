import classNames from "classnames";
import debouncePromise from "debounce-promise";
import { defaults, isFunction } from "lodash";
import * as React from "react";
import { useSelector } from "react-redux";
import { FixedSizeGrid, FixedSizeList } from "react-window";
import InfiniteLoader from "react-window-infinite-loader";

import Header from "./Header";
import LazilyRenderedRow from "./LazilyRenderedRow";
import LazilyRenderedThumbnail from "./LazilyRenderedThumbnail";
import useFileSelector from "./useFileSelector";
import { Action, setError } from "../DirectoryTree/directory-hierarchy-state";
import EmptyFileListMessage from "../EmptyFileListMessage";
import { FileView } from "../../entity/SearchParams";
import FileSet from "../../entity/FileSet";
import useLayoutMeasurements from "../../hooks/useLayoutMeasurements";
import useFileAccessContextMenu from "../../hooks/useFileAccessContextMenu";
import { selection } from "../../state";

import styles from "./FileList.module.css";

const DEBOUNCE_WAIT_FOR_DATA_FETCHING = 100; // ms

// This is an arbitrary value that needs to be set to some number > 0 in order to prompt react-window-infinite-loader
// to start calling `loadMoreItems`.
const DEFAULT_TOTAL_COUNT = 1000;

interface FileListProps {
    className?: string;
    dispatch: (value: Action) => void;
    fileSet: FileSet;
    isRoot: boolean;
    rowHeight?: number; // how tall each row of the list will be, in px
    sortOrder: number;
}

const DEFAULTS = {
    totalCount: DEFAULT_TOTAL_COUNT,
};

const MAX_NON_ROOT_HEIGHT = 300;
const SMALL_ROW_HEIGHT = 20;
const TALL_ROW_HEIGHT = 24;

/**
 * Wrapper for react-window-infinite-loader and react-window that knows how to lazily fetch its own data. It will lay
 * itself out to be 100% the height and width of its parent.
 */
export default function FileList(props: FileListProps) {
    const [totalCount, setTotalCount] = React.useState<number | null>(null);
    const [localError, setLocalError] = React.useState<Error>();
    const [lastVisibleRowIndex, setLastVisibleRowIndex] = React.useState<number>(0);
    const fileView = useSelector(selection.selectors.getFileView);
    const fileSelection = useSelector(selection.selectors.getFileSelection);
    const fileGridColumnCount = useSelector(selection.selectors.getFileGridColCount);
    const isDisplayingSmallFont = useSelector(selection.selectors.getShouldDisplaySmallFont);
    const isColumnWidthOverflowing = useSelector(selection.selectors.isColumnWidthOverflowing);
    const [measuredNodeRef, measuredHeight, measuredWidth] = useLayoutMeasurements<
        HTMLDivElement
    >();
    let defaultRowHeight = isDisplayingSmallFont ? SMALL_ROW_HEIGHT : TALL_ROW_HEIGHT;
    if (fileView !== FileView.LIST) defaultRowHeight = measuredWidth / fileGridColumnCount;
    const { className, fileSet, isRoot, rowHeight, sortOrder } = defaults({}, props, DEFAULTS, {
        rowHeight: defaultRowHeight,
    });

    const onSelect = useFileSelector(fileSet, sortOrder);

    // Callback provided to individual LazilyRenderedRows to be called on `contextmenu`
    const onFileRowContextMenu = useFileAccessContextMenu();

    // If this is the "root" file list (e.g., all files in FMS), this component should take up
    // 100% of the height of its container.
    // Otherwise, the height of the list should reflect the number of items it has to render, up to
    // a certain maximum.
    const dataDrivenHeight = rowHeight * (totalCount || DEFAULT_TOTAL_COUNT) + 3 * rowHeight; // adding three additional rowHeights leaves room for the header + horz. scroll bar
    const calculatedHeight = Math.min(MAX_NON_ROOT_HEIGHT, dataDrivenHeight);
    const height = isRoot ? measuredHeight : calculatedHeight;

    const totalRows = Math.ceil(
        (totalCount || DEFAULT_TOTAL_COUNT) / (fileView === FileView.LIST ? 1 : fileGridColumnCount)
    );
    // complement to isColumnWidthOverflowing
    const isRowHeightOverflowing = totalRows * rowHeight > height;
    // hide overlay when we reach the bottom of the list
    const atEndOfList = lastVisibleRowIndex === totalRows - 1;

    const listRef = React.useRef<FixedSizeList | null>(null);
    const gridRef = React.useRef<FixedSizeGrid | null>(null);
    const outerRef = React.useRef<HTMLDivElement | null>(null);

    // This hook is responsible for ensuring that if the details pane is currently showing a file row
    // within this FileList the file row shown in the details pane is scrolled into view.
    React.useEffect(() => {
        if (
            (listRef.current || gridRef.current) &&
            outerRef.current &&
            fileSelection.isFocused(fileSet)
        ) {
            const { indexWithinFileSet } = fileSelection.getFocusedItemIndices();
            if (indexWithinFileSet !== undefined) {
                const listScrollTop = outerRef.current.scrollTop;
                let focusedItemTop = indexWithinFileSet * rowHeight;
                if (gridRef.current) {
                    focusedItemTop = (indexWithinFileSet / fileGridColumnCount) * rowHeight;
                }
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
                    if (listRef.current) {
                        listRef.current.scrollTo(Math.max(0, centeredWithinVisibleArea));
                    } else if (gridRef.current) {
                        gridRef.current.scrollTo({
                            scrollTop: Math.max(0, centeredWithinVisibleArea),
                        });
                    }
                }
            }
        }
    }, [fileSelection, fileSet, height, fileGridColumnCount, rowHeight]);

    // Get a count of all files in the FileList, but don't wait on it
    React.useEffect(() => {
        let cancel = false;
        fileSet
            .fetchTotalCount()
            .then((count) => {
                if (!cancel) {
                    setTotalCount(count);
                }
            })
            .catch((err) => {
                // Data source may not be prepared if the data source is taking longer to load
                // than the component does to render. In this case, we can ignore the error.
                // The component will re-render when the data source is prepared.
                if (!err?.message.includes("Data source is not prepared")) {
                    throw err;
                }
            });
        return () => {
            cancel = true;
        };
    }, [fileSet]);

    const fileFetchWrapper = async (startIndex: number, endIndex: number) => {
        setLocalError(undefined); // reset
        try {
            await fileSet.fetchFileRange(startIndex, endIndex);
        } catch (err) {
            props.dispatch(setError(err as Error, isRoot));
            // Root has its own error handling
            if (!isRoot) setLocalError(err as Error);
            throw err;
        }
    };

    let content: React.ReactNode;
    if (!!localError) {
        return (
            <div className={classNames(styles.container, className)}>
                <div className={styles.errorMessage}>
                    Some files could not be loaded. Error: {localError.message}
                </div>
            </div>
        );
    }
    if (totalCount === null || totalCount > 0) {
        if (height > 0) {
            // When this component isRoot the height is measured. It takes
            // a few milliseconds for that to happen along with a re-render, but
            // by then the <InfiniteLoader /> used here will already have made a
            // request for files based on that height that it didn't need to
            // if it had just waited until the measured height was present.
            content = (
                <InfiniteLoader
                    key={fileSet.instanceId} // force a re-render whenever FileSet changes
                    isItemLoaded={fileSet.isFileMetadataLoadingOrLoaded}
                    loadMoreItems={debouncePromise<any>(
                        fileFetchWrapper,
                        DEBOUNCE_WAIT_FOR_DATA_FETCHING
                    )}
                    itemCount={totalCount || DEFAULT_TOTAL_COUNT}
                >
                    {({ onItemsRendered, ref: innerRef }) => {
                        const callbackRefList = (instance: FixedSizeList | null) => {
                            listRef.current = instance;

                            // react-window-infinite-loader takes a reference to the List component instance:
                            // https://github.com/bvaughn/react-window-infinite-loader/blob/571f6c37b692d2e01bd3b762cdc93ca7c8f7ebf3/src/InfiniteLoader.js#L103-L105
                            if (isFunction(innerRef)) {
                                innerRef(instance);
                            }
                        };
                        const callbackRefGrid = (instance: FixedSizeGrid | null) => {
                            gridRef.current = instance;
                            if (isFunction(innerRef)) {
                                innerRef(instance);
                            }
                        };
                        // Custom onItemsRendered for grids
                        // The built-in onItemsRendered from InfiniteLoader only supports lists
                        const onGridItemsRendered = (gridData: any) => {
                            const {
                                visibleRowStartIndex,
                                visibleRowStopIndex,
                                visibleColumnStopIndex,
                                overscanRowStartIndex,
                                overscanRowStopIndex,
                                overscanColumnStopIndex,
                            } = gridData;

                            // Convert injected grid props to InfiniteLoader list props
                            const visibleStartIndex =
                                visibleRowStartIndex * (visibleColumnStopIndex + 1);
                            const visibleStopIndex =
                                visibleRowStopIndex * (visibleColumnStopIndex + 1);
                            const overscanStartIndex =
                                overscanRowStartIndex * (overscanColumnStopIndex + 1);
                            const overscanStopIndex =
                                overscanRowStopIndex * (overscanColumnStopIndex + 1);

                            setLastVisibleRowIndex(visibleRowStopIndex);
                            onItemsRendered({
                                // call onItemsRendered from InfiniteLoader
                                visibleStartIndex,
                                visibleStopIndex,
                                overscanStartIndex,
                                overscanStopIndex,
                            });
                        };

                        if (fileView === FileView.LIST) {
                            return (
                                <FixedSizeList
                                    itemData={{
                                        fileSet: fileSet,
                                        onSelect,
                                        onContextMenu: onFileRowContextMenu,
                                    }}
                                    itemSize={rowHeight} // row height
                                    height={height} // height of the list itself; affects number of rows rendered at any given time
                                    itemCount={totalCount || DEFAULT_TOTAL_COUNT}
                                    onItemsRendered={(renderProps) => {
                                        setLastVisibleRowIndex(renderProps.visibleStopIndex);
                                        onItemsRendered(renderProps);
                                    }}
                                    outerElementType={Header}
                                    outerRef={outerRef}
                                    ref={callbackRefList}
                                    width={measuredWidth}
                                >
                                    {LazilyRenderedRow}
                                </FixedSizeList>
                            );
                        }

                        return (
                            <FixedSizeGrid
                                itemData={{
                                    fileSet: fileSet,
                                    onSelect,
                                    onContextMenu: onFileRowContextMenu,
                                    measuredWidth: measuredWidth,
                                    itemCount: totalCount || DEFAULT_TOTAL_COUNT,
                                }}
                                columnCount={fileGridColumnCount}
                                rowCount={Math.ceil(
                                    (totalCount || DEFAULT_TOTAL_COUNT) / fileGridColumnCount
                                )}
                                height={height} // height of the list itself; affects number of rows rendered at any given time
                                width={measuredWidth}
                                rowHeight={rowHeight}
                                columnWidth={rowHeight}
                                outerRef={outerRef}
                                ref={callbackRefGrid}
                                onItemsRendered={onGridItemsRendered}
                            >
                                {LazilyRenderedThumbnail}
                            </FixedSizeGrid>
                        );
                    }}
                </InfiniteLoader>
            );
        }
    } else {
        content = <EmptyFileListMessage />;
    }

    return (
        <div className={classNames(styles.container, className)}>
            <div
                className={classNames(styles.list)}
                style={{
                    height: isRoot ? undefined : `${calculatedHeight}px`,
                }}
                ref={measuredNodeRef}
            >
                <div
                    className={classNames({
                        [styles.horizontalGradient]: isColumnWidthOverflowing,
                        [styles.horizontalGradientCropped]: isRowHeightOverflowing,
                    })}
                ></div>
                <div
                    className={classNames({
                        [styles.verticalGradient]: isRowHeightOverflowing && !atEndOfList,
                        [styles.verticalGradientCropped]: isColumnWidthOverflowing,
                    })}
                ></div>
                {content}
            </div>
            <p className={styles.rowCountDisplay}>
                {totalCount !== null ? `${totalCount.toLocaleString()} files` : "Counting files..."}
            </p>
        </div>
    );
}
