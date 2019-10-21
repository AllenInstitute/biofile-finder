import { debounce } from "lodash";
import * as React from "react";

const DEBOUNCE_WAIT_TO_REMEASURE = 50; // ms

/**
 * Custom React hook to measure a DOM node after all DOM mutations have been committed during a render cycle but before
 * paint. It will remeasure itself on resize, and is debounced so as not to be called more than once (on trailing edge)
 * within `DEBOUNCE_WAIT_TO_REMEASURE` milliseconds.
 */
export default function useLayoutMeasurements(ref: React.RefObject<HTMLElement>): [number, number] {
    const [height, setHeight] = React.useState(0);
    const [width, setWidth] = React.useState(0);

    const resizeListener = React.useCallback(
        debounce(() => {
            if (ref.current) {
                const {
                    height: currentHeight,
                    width: currentWidth,
                } = ref.current.getBoundingClientRect();
                setHeight(currentHeight);
                setWidth(currentWidth);
            }
        }, DEBOUNCE_WAIT_TO_REMEASURE),
        [ref.current] // recreate callback only if ref.current changes
    );

    React.useLayoutEffect(() => {
        resizeListener();
        window.addEventListener("resize", resizeListener);
        return function cleanUp() {
            window.removeEventListener("resize", resizeListener);
        };
    }, [ref.current]); // only run on mount and unmount if ref.current stays constant

    return [height, width];
}
