import * as classNames from "classnames";
import * as debouncePromise from "debounce-promise";
import { defaults, isUndefined } from "lodash";
import * as React from "react";
import { FixedSizeList } from "react-window";
import InfiniteLoader from "react-window-infinite-loader";

import Header from "./Header";
import FileSet from "../../entity/FileSet";
import LazilyRenderedRow from "./LazilyRenderedRow";
import useLayoutMeasurements from "../../hooks/useLayoutMeasurements";
import useFileSelector from "./useFileSelector";

const styles = require("./FileList.module.css");

const DEBOUNCE_WAIT_FOR_DATA_FETCHING = 50; // ms

// This is an arbitrary value that needs to be set to some number > 0 in order to prompt react-window-infinite-loader
// to start calling `loadMoreItems`.
const DEFAULT_TOTAL_COUNT = 1000;

/**
 * NOTE! If props are modified, the `propsAreEqual` override (passed to React.memo below) MUST be updated.
 */
interface FileListProps {
    [index: string]: any;
    className?: string;
    fileSet: FileSet;
    rowHeight?: number; // how tall each row of the list will be, in px
}

const DEFAULTS = {
    rowHeight: 22,
};

/**
 * Wrapper for react-window-infinite-loader and react-window that knows how to lazily fetch its own data. It will lay
 * itself out to be 100% the height and width of its parent.
 */
function FileList(props: FileListProps) {
    const { className, fileSet, rowHeight } = defaults({}, props, DEFAULTS);

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
                        itemData={{
                            fileSet: fileSet,
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

const propsToCompareReferentially = ["className", "rowHeight"];

export default React.memo(FileList, (prevProps, nextProps) => {
    const referentialPropsAreEqual = propsToCompareReferentially.every(
        (prop) => prevProps[prop] === nextProps[prop]
    );

    if (!referentialPropsAreEqual || !prevProps.fileSet.equals(nextProps.fileSet)) {
        return false;
    }

    return true;
});
