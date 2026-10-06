import React, { useCallback, useEffect } from "react";

/**
 * Prevents focus loss when dragging the mouse outside of a container. This can
 * prevent accidental closing of parent callouts for draggable child elements.
 * @param containerRef The container for the draggable element.
 * @returns A reset callback to call when the element is hidden or the parent
 * callout is dismissed.
 */
export default function useDisableFocusLossOnDrag(
    containerRef: React.RefObject<HTMLElement>
): () => void {
    const isDraggingRef = React.useRef(false);
    const preventFocusLossRef = React.useRef(false);

    useEffect(() => {
        const handleMouseDown = () => {
            isDraggingRef.current = true;
        };
        const handleMouseLeave = () => {
            if (isDraggingRef.current) {
                preventFocusLossRef.current = true;
            }
        };
        const handleMouseEnter = () => {
            if (isDraggingRef.current) {
                preventFocusLossRef.current = false;
            }
        };
        const handleMouseUp = (event: MouseEvent) => {
            if (preventFocusLossRef.current) {
                event.preventDefault();
            }
            if (isDraggingRef.current) {
                isDraggingRef.current = false;
                preventFocusLossRef.current = false;
            }
        };
        const container = containerRef.current;
        if (container) {
            container.addEventListener("mousedown", handleMouseDown);
            container.addEventListener("mouseleave", handleMouseLeave);
            container.addEventListener("mouseenter", handleMouseEnter);
        }
        document.body.addEventListener("mouseup", handleMouseUp, {
            capture: true,
        });
        return () => {
            if (container) {
                container.removeEventListener("mousedown", handleMouseDown);
                container.removeEventListener("mouseleave", handleMouseLeave);
                container.removeEventListener("mouseenter", handleMouseEnter);
            }
            document.body.removeEventListener("mouseup", handleMouseUp, { capture: true });
        };
    }, [containerRef]);

    const reset = useCallback(() => {
        preventFocusLossRef.current = false;
        isDraggingRef.current = false;
    }, []);

    return reset;
}
