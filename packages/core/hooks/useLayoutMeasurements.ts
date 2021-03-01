import { debounce } from "lodash";
import * as React from "react";

const DEBOUNCE_WAIT_TO_REMEASURE = 50; // ms

/**
 * Custom React hook to measure a DOM node. It will remeasure itself on resize, and is debounced so as
 * not to be called more than once (on trailing edge) within `DEBOUNCE_WAIT_TO_REMEASURE` milliseconds.
 */
export default function useLayoutMeasurements<T extends HTMLElement>(): [
    React.MutableRefObject<T | null>,
    number,
    number
] {
    const ref = React.useRef<T | null>(null);
    const [height, setHeight] = React.useState(0);
    const [width, setWidth] = React.useState(0);

    React.useEffect(() => {
        let resizeObserver: ResizeObserver;
        if (ref.current) {
            resizeObserver = new ResizeObserver(
                debounce(([entry]: ResizeObserverEntry[]) => {
                    if (ref.current && entry.target === ref.current) {
                        const {
                            height: currentHeight,
                            width: currentWidth,
                        } = ref.current.getBoundingClientRect();
                        setHeight(currentHeight);
                        setWidth(currentWidth);
                    }
                }, DEBOUNCE_WAIT_TO_REMEASURE)
            );

            resizeObserver.observe(ref.current);
        }

        return function cleanUp() {
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
        };
    }, []);

    return [ref, height, width];
}
