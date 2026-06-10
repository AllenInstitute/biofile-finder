import * as React from "react";

interface HorizontalScrollState {
    scrollLeft: number;
    containerWidth: number;
}

/**
 * Context providing horizontal scroll position and visible width of the file list's
 * scroll container. Used by FileRow to virtualize cells horizontally.
 */
const HorizontalScrollContext = React.createContext<HorizontalScrollState>({
    scrollLeft: 0,
    containerWidth: 0,
});

export default HorizontalScrollContext;
