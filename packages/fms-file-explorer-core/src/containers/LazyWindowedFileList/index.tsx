import * as classNames from "classnames";
import * as debouncePromise from "debounce-promise";
import { defaults, isUndefined } from "lodash";
import * as React from "react";
import { FixedSizeList } from "react-window";
import InfiniteLoader from "react-window-infinite-loader";

import Header from "./Header";
import FileSet from "../../entity/FileSet";
import useLayoutMeasurements from "../../hooks/useLayoutMeasurements";
import LazilyRenderedRow from "./LazilyRenderedRow";
import useFileSelector from "./useFileSelector";
import VirtualListInnerElement from "./VirtualListInnerElement";

const styles = require("./style.module.css");

const DEBOUNCE_WAIT_FOR_DATA_FETCHING = 50; // ms

// This is an arbitrary value that needs to be set to some number > 0 in order to prompt react-window-infinite-loader
// to start calling `loadMoreItems`.
const DEFAULT_TOTAL_COUNT = 1000;

/**
 * NOTE! If any new props are added, the `propsAreEqual` override (passed to React.memo below) MUST be updated.
 */
interface LazyWindowedFileListProps {
    [index: string]: any;
    className?: string;
    fileSet: FileSet;
    level?: number; // maps to how far indented the first column of the file row should be
    rowHeight?: number; // how tall each row of the list will be, in px
}

const DEFAULTS = {
    level: 0,
    rowHeight: 22,
};

/**
 * Wrapper for react-window-infinite-loader and react-window that knows how to lazily fetch its own data. It will lay
 * itself out to be 100% the height and width of its parent.
 */
function LazyWindowedFileList(props: LazyWindowedFileListProps) {
    const { className, fileSet, level, rowHeight } = defaults({}, props, DEFAULTS);

    const [ref, height] = useLayoutMeasurements<HTMLDivElement>();
    const onSelect = useFileSelector(fileSet);

    const totalCount = isUndefined(fileSet.totalCount) ? DEFAULT_TOTAL_COUNT : fileSet.totalCount;

    return (
        <div className={classNames(styles.list, className)} ref={ref}>
            <InfiniteLoader
                isItemLoaded={fileSet.isFileMetadataLoaded}
                loadMoreItems={debouncePromise(
                    fileSet.fetchFileRange,
                    DEBOUNCE_WAIT_FOR_DATA_FETCHING
                )}
                itemCount={totalCount}
            >
                {({ onItemsRendered, ref }) => (
                    <FixedSizeList
                        innerElementType={VirtualListInnerElement}
                        itemData={{
                            files: fileSet.files,
                            level,
                            onSelect,
                        }}
                        itemSize={rowHeight} // row height
                        height={height} // height of the list itself; affects number of rows rendered at any given time
                        itemCount={totalCount}
                        onItemsRendered={onItemsRendered}
                        outerElementType={Header}
                        ref={ref}
                        width="100%"
                    >
                        {LazilyRenderedRow}
                    </FixedSizeList>
                )}
            </InfiniteLoader>
        </div>
    );
}

const propsToCompareReferentially = ["className", "level", "rowHeight"];

export default React.memo(LazyWindowedFileList, (prevProps, nextProps) => {
    const referentialPropsAreEqual = propsToCompareReferentially.every(
        (prop) => prevProps[prop] === nextProps[prop]
    );

    if (!referentialPropsAreEqual || !prevProps.fileSet.equals(nextProps.fileSet)) {
        return false;
    }

    return true;
});
