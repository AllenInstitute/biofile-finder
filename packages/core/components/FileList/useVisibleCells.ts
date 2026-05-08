import * as React from "react";
import { useSelector } from "react-redux";

import HorizontalScrollContext from "./HorizontalScrollContext";
import { selection } from "../../state";

// Number of pixels to render beyond the visible area on each side
const OVERSCAN = 200;

/**
 * Custom hook to determine which columns in a FileRow should be rendered based on
 * the current horizontal scroll position and container width. Returns the indices
 * of the first and last visible columns, as well as the amount of left and right padding
 * needed to offset the visible columns within the FileRow. This is used to implement
 * virtualized horizontal scrolling within FileRow, which is necessary to efficiently
 */
export default function useVisibleColumns() {
    const columns = useSelector(selection.selectors.getColumns);
    const { scrollLeft, containerWidth } = React.useContext(HorizontalScrollContext);

    // Determine visible range of columns based on horizontal scroll position.
    // Use a spacer before and after for off-screen columns to preserve correct layout.
    return React.useMemo(() => {
        // If no container width yet (not measured), render some columns
        if (!containerWidth) {
            return {
                columns: columns.slice(0, 6), // Arbitrary limit to prevent rendering too many columns before measurement
                padding: { left: 0, right: 0 },
            };
        }

        const viewStart = scrollLeft - OVERSCAN;
        const viewEnd = scrollLeft + containerWidth + OVERSCAN;

        let cumulativeLeft = 0;
        let startIndex = 0;
        let endIndex = columns.length;
        let leftPad = 0;
        let rightPad = 0;

        // Find first visible column
        for (let i = 0; i < columns.length; i++) {
            if (cumulativeLeft + columns[i].width > viewStart) {
                startIndex = i;
                leftPad = cumulativeLeft;
                break;
            }
            cumulativeLeft += columns[i].width;
        }

        // Find last visible column
        cumulativeLeft = leftPad;
        for (let i = startIndex; i < columns.length; i++) {
            cumulativeLeft += columns[i].width;
            if (cumulativeLeft >= viewEnd) {
                endIndex = i + 1;
                break;
            }
        }

        // Calculate right padding
        for (let i = endIndex; i < columns.length; i++) {
            rightPad += columns[i].width;
        }

        return {
            columns: columns.slice(startIndex, endIndex),
            padding: { left: leftPad, right: rightPad },
        };
    }, [columns, scrollLeft, containerWidth]);
}
