import { debounce } from "lodash";
import * as React from "react";
import { ResizeObserver } from "resize-observer";

const DEBOUNCE_WAIT_TO_REMEASURE = 50; // ms

/**
 * Custom React hook to measure a DOM node after all DOM mutations have been committed during a render cycle but before
 * paint. It will remeasure itself on resize, and is debounced so as not to be called more than once (on trailing edge)
 * within `DEBOUNCE_WAIT_TO_REMEASURE` milliseconds.
 */
export default function useLayoutMeasurements<T extends HTMLElement>(): [
    React.RefObject<T>,
    number,
    number
] {
    const ref = React.useRef<T>(null);
    const [height, setHeight] = React.useState(0);
    const [width, setWidth] = React.useState(0);

    React.useLayoutEffect(() => {
        let resizeObserver: ResizeObserver;
        if (ref.current) {
            // GM: 11/18/2019
            // Can ditch use of ponyfill once Typescript's lib.dom.ts includes ResizeObserver API:
            // https://github.com/Microsoft/TypeScript/issues/28502
            // https://github.com/Microsoft/TSJS-lib-generator/blob/master/inputfiles/idlSources.json
            resizeObserver = new ResizeObserver(
                debounce(([entry]) => {
                    if (entry.target === ref.current) {
                        // GM: 11/18/2019
                        // When the ResizeObserver uniformly supports ResizeObserverEntry::borderBoxSize there will be no
                        // need to query the bounding client rect off of ref
                        // https://drafts.csswg.org/resize-observer-1/#dom-resizeobserverentry-borderboxsize
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
    }, [ref]);

    return [ref, height, width];
}
