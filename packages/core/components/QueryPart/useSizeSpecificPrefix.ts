import * as React from "react";

const VISUAL_SEPARATOR = " : ";
const ELLIPSIS = "…";

/**
 * Build the breadcrumb prefix string that keeps the last `keptTrailing` whole parent segments.
 * - keptTrailing === parents.length -> the full prefix, no ellipsis ("A : B : ").
 * - 0 < keptTrailing < length      -> "… : B : " (oldest parents dropped, never the middle).
 * - keptTrailing === 0             -> "… : ".
 */
export function buildPrefix(parents: string[], keptTrailing: number): string {
    if (keptTrailing >= parents.length) {
        return parents.join(VISUAL_SEPARATOR) + VISUAL_SEPARATOR;
    }
    const kept = parents.slice(parents.length - keptTrailing);
    return [ELLIPSIS, ...kept].join(VISUAL_SEPARATOR) + VISUAL_SEPARATOR;
}

/**
 * Choose how much of the prefix to show based on the available width, keeping as many WHOLE
 * trailing parents as fit (e.g. "… : Parent : Column"); parents are only ever dropped from the
 * front, never the middle. Returns the prefix string to render, or null when not even "… : " fits
 * alongside the leaf (in which case the leaf is shown alone and truncates from its start).
 */
export default function useSizeSpecificPrefix(
    parents: string[],
    leaf: string
): {
    prefix: string | null;
    rowTitleRef: React.RefObject<HTMLDivElement>;
    iconRef: React.RefObject<HTMLSpanElement>;
    probeRef: (kept: number) => (el: HTMLElement | null) => void;
    leafProbeRef: (el: HTMLElement | null) => void;
} {
    const rowTitleRef = React.useRef<HTMLDivElement>(null);
    const iconRef = React.useRef<HTMLSpanElement>(null);
    const probeElements = React.useRef<Map<number, HTMLElement>>(new Map());
    const leafElement = React.useRef<HTMLElement | null>(null);

    // Default to the full prefix; the layout effect narrows it once widths are known.
    const [prefix, setPrefix] = React.useState<string | null>(
        parents.length ? buildPrefix(parents, parents.length) : null
    );

    // Stable callback-ref factories — returns a ref callback for a given "kept" count.
    const probeRef = React.useCallback(
        (kept: number) => (el: HTMLElement | null) => {
            if (el) {
                probeElements.current.set(kept, el);
            } else {
                probeElements.current.delete(kept);
            }
        },
        []
    );

    const leafProbeRef = React.useCallback((el: HTMLElement | null) => {
        leafElement.current = el;
    }, []);

    React.useLayoutEffect(() => {
        const rowTitle = rowTitleRef.current;
        if (!parents.length || !rowTitle) {
            setPrefix(null);
            return;
        }
        const measure = () => {
            const available = rowTitle.clientWidth - (iconRef.current?.offsetWidth ?? 0);
            const leafWidth = leafElement.current?.offsetWidth ?? 0;
            // Prefer the most parents: walk from the full prefix down and take the first that fits.
            for (let kept = parents.length; kept >= 0; kept--) {
                const probe = probeElements.current.get(kept);
                // +1 tolerance: offsetWidth rounds up.
                if (probe && probe.offsetWidth + leafWidth <= available + 1) {
                    setPrefix(buildPrefix(parents, kept));
                    return;
                }
            }
            // if not even "… : " + leaf fits -> show leaf only
            setPrefix(null);
        };
        measure();
        // Defer the observer-driven re-measure to the next frame so the resulting state update
        // doesn't mutate layout inside the observer's own delivery cycle — doing so synchronously
        // triggers the benign "ResizeObserver loop completed with undelivered notifications" error.
        let frame = 0;
        const observer = new ResizeObserver(() => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(measure);
        });
        observer.observe(rowTitle);
        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [parents.join("."), leaf]);

    return { prefix, rowTitleRef, iconRef, probeRef, leafProbeRef };
}
