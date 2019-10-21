import * as debouncePromise from "debounce-promise";
import * as React from "react";
import { FixedSizeList } from "react-window";
import InfiniteLoader from "react-window-infinite-loader";

import useFileFetcher from "./useFileFetcher";
import useLayoutMeasurements from "./useLayoutMeasurements";

import FileRow from "./FileRow";

const styles = require("./style.module.css");

const DEBOUNCE_WAIT_FOR_DATA_FETCHING = 50; // ms

interface LazyWindowedFileListProps {
    rowHeight: number; // how tall each row of the list will be, in px
}

/**
 * Wrapper for react-window-infinite-loader and react-window that knows how to lazily fetch its own data. It will lay
 * itself out to be 100% the height and width of its parent.
 */
export default function LazyWindowedFileList(props: LazyWindowedFileListProps) {
    const { rowHeight } = props;

    const rootEl = React.useRef<HTMLDivElement>(null);
    const [height] = useLayoutMeasurements(rootEl);
    const [files, totalCount, fetchFiles] = useFileFetcher();

    const isFileLoaded = (index: number) => files.has(index);

    return (
        <div className={styles.list} ref={rootEl}>
            <InfiniteLoader
                isItemLoaded={isFileLoaded}
                loadMoreItems={debouncePromise(fetchFiles, DEBOUNCE_WAIT_FOR_DATA_FETCHING)}
                itemCount={totalCount}
            >
                {({ onItemsRendered, ref }) => (
                    <FixedSizeList
                        itemData={files}
                        itemSize={rowHeight} // row height
                        height={height} // height of the list itself; affects number of rows rendered at any given time
                        itemCount={totalCount}
                        onItemsRendered={onItemsRendered}
                        ref={ref}
                        width="100%"
                    >
                        {FileRow}
                    </FixedSizeList>
                )}
            </InfiniteLoader>
        </div>
    );
}

LazyWindowedFileList.defaultProps = {
    rowHeight: 30,
};
