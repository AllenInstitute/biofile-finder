import * as React from "react";

/**
 * Custom React hook to check whether an element has overflowing (vertical) content
 * past the bottom bound of its container.
 * Returns false if already at the bottom of content.
 * @param deps  Any other dependencies that should force a re-calculation
 */
export default function useCheckOverflowScroll<T extends HTMLElement>(
    deps?: React.ReactNode
): [React.MutableRefObject<T | null>, boolean] {
    const ref = React.useRef<T | null>(null);
    const [hasScroll, setHasScroll] = React.useState(false);

    React.useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const checkScroll = () => {
            const hasOverflowingContent = el.scrollHeight > el.clientHeight;
            // we've reached the end of the content if the distance scrolled
            // from the top (rounded up to account for sub-pixel differences)
            // is equal to the total content height
            const isAtBottomOfContent =
                Math.ceil(el.scrollTop) + el.clientHeight >= el.scrollHeight;
            setHasScroll(hasOverflowingContent && !isAtBottomOfContent);
        };
        checkScroll();

        const observer = new ResizeObserver(checkScroll);
        observer.observe(el);
        el.addEventListener("scroll", checkScroll);
        return () => {
            observer.disconnect();
            el.removeEventListener("scroll", checkScroll);
        };
    }, [deps]);

    return [ref, hasScroll];
}
