import classNames from "classnames";
import * as debouncePromise from "debounce-promise";
import { defaults, isFunction } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { FixedSizeList } from "react-window";
import InfiniteLoader from "react-window-infinite-loader";

import getContextMenuItems from "../ContextMenu/items";
import FileSet from "../../entity/FileSet";
import Header from "./Header";
import LazilyRenderedRow from "./LazilyRenderedRow";
import { interaction, selection } from "../../state";
import useLayoutMeasurements from "../../hooks/useLayoutMeasurements";
import useFileSelector from "./useFileSelector";

const styles = require("./FileList.module.css");

const DEBOUNCE_WAIT_FOR_DATA_FETCHING = 50; // ms

// This is an arbitrary value that needs to be set to some number > 0 in order to prompt react-window-infinite-loader
// to start calling `loadMoreItems`.
const DEFAULT_TOTAL_COUNT = 1000;

interface FileListProps {
    className?: string;
    fileSet: FileSet;
    isRoot: boolean;
    totalCount?: number;
    rowHeight?: number; // how tall each row of the list will be, in px
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
    const { className, fileSet, isRoot, rowHeight, totalCount } = defaults({}, props, DEFAULTS);

    const onSelect = useFileSelector(fileSet);
    const dispatch = useDispatch();
    const fileSelection = useSelector(
        selection.selectors.getFileSelection
    );
    const numSelectedFilesWithinFileSet = fileSelection.size(fileSet);
    const selectedFilesText = numSelectedFilesWithinFileSet ? `(${numSelectedFilesWithinFileSet} selected)` : "";

    // If this is the "root" file list (e.g., all files in FMS), this component should take up
    // 100% of the height of its container.
    // Otherwise, the height of the list should reflect the number of items it has to render, up to
    // a certain maximum.
    const [outerRef, measuredHeight, measuredWidth] = useLayoutMeasurements<HTMLDivElement>();
    const dataDrivenHeight = rowHeight * totalCount + 3 * rowHeight; // adding three additional rowHeights leaves room for the header + horz. scroll bar
    const calculatedHeight = Math.min(MAX_NON_ROOT_HEIGHT, dataDrivenHeight);
    const style = {
        height: isRoot ? undefined : `${calculatedHeight}px`,
    };

    const listRef = React.useRef<FixedSizeList | null>(null);
    React.useEffect(() => {
        const fileSetIsFocused = fileSelection.isFocused(fileSet);

        // Ensure the list is in view if it has focus within the details pane
        if (outerRef.current && fileSetIsFocused) {
            outerRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }

        // Ensure the currently focused item within this list is scrolled into view
        if (listRef.current && fileSetIsFocused) {
            // "'smart' - If the item is already visible, don't scroll at all. If it is less than one viewport away,
            // scroll as little as possible so that it becomes visible. If it is more than one viewport away,
            // scroll so that it is centered within the list."
            // Source: https://react-window.now.sh/#/api/FixedSizeList
            const { indexWithinFileSet } = fileSelection.getFocusedItemIndices();
            if (indexWithinFileSet === undefined) {
                return;
            }
            listRef.current.scrollToItem(indexWithinFileSet, "smart");
        }
    }, [fileSelection, fileSet]);

    // Callback provided to individual LazilyRenderedRows to be called on `contextmenu`
    const onFileRowContextMenu = (evt: React.MouseEvent) => {
        const availableItems = getContextMenuItems(dispatch);
        const items = [];
        if (fileSelection.size() === 0) {
            items.push({ ...availableItems.DOWNLOAD, disabled: true });
        } else {
            items.push(availableItems.DOWNLOAD);
        }
        dispatch(interaction.actions.showContextMenu(items, evt.nativeEvent));
    };

    return (
        <div className={classNames(styles.container, className)}>
            <div className={classNames(styles.list)} style={style} ref={outerRef}>
                <InfiniteLoader
                    key={fileSet.hash}
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
                                height={isRoot ? measuredHeight : calculatedHeight} // height of the list itself; affects number of rows rendered at any given time
                                itemCount={totalCount}
                                onItemsRendered={onItemsRendered}
                                outerElementType={Header}
                                ref={callbackRef}
                                width={measuredWidth}
                            >
                                {LazilyRenderedRow}
                            </FixedSizeList>
                        );
                    }}
                </InfiniteLoader>
            </div>
            <p className={styles.rowCountDisplay}>
                {totalCount} files {selectedFilesText}
            </p>
        </div>
    );
}
