import * as React from "react";

/**
 * Custom React hook that encapsulates all logic for drag-and-drop (mouse) and
 * keyboard-based reordering of a list of string-keyed items.
 *
 * Returns event handlers to attach to each item and state values for visual feedback.
 *
 * @param items   Ordered list of string keys representing the items that can be reordered.
 * @param onReorder  Callback invoked with the newly-ordered list of keys whenever the order changes.
 */
export default function useDragAndDropOrder(items: string[], onReorder: (newOrder: string[]) => void) {
    const [draggedItem, setDraggedItem] = React.useState<string | null>(null);
    const [dragOverItem, setDragOverItem] = React.useState<string | null>(null);
    const [keyboardSelectedItem, setKeyboardSelectedItem] = React.useState<string | null>(null);

    const onDragStart = React.useCallback((itemKey: string) => {
        setDraggedItem(itemKey);
    }, []);

    const onDragOver = React.useCallback(
        (e: React.DragEvent, itemKey: string) => {
            e.preventDefault();
            if (itemKey !== draggedItem) {
                setDragOverItem(itemKey);
            }
        },
        [draggedItem]
    );

    const onDrop = React.useCallback(
        (targetKey: string) => {
            if (!draggedItem || draggedItem === targetKey) {
                setDraggedItem(null);
                setDragOverItem(null);
                return;
            }
            const reordered = [...items];
            const fromIndex = reordered.indexOf(draggedItem);
            const toIndex = reordered.indexOf(targetKey);
            const [removed] = reordered.splice(fromIndex, 1);
            reordered.splice(toIndex, 0, removed);
            onReorder(reordered);
            setDraggedItem(null);
            setDragOverItem(null);
        },
        [draggedItem, items, onReorder]
    );

    const onDragEnd = React.useCallback(() => {
        setDraggedItem(null);
        setDragOverItem(null);
    }, []);

    const onKeyDown = React.useCallback(
        (e: React.KeyboardEvent, itemKey: string) => {
            if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                setKeyboardSelectedItem((prev) => (prev === itemKey ? null : itemKey));
            } else if (e.key === "Escape") {
                setKeyboardSelectedItem(null);
            } else if (
                (e.key === "ArrowLeft" || e.key === "ArrowRight") &&
                keyboardSelectedItem
            ) {
                e.preventDefault();
                const currentIndex = items.indexOf(keyboardSelectedItem);
                const newIndex =
                    e.key === "ArrowLeft"
                        ? Math.max(0, currentIndex - 1)
                        : Math.min(items.length - 1, currentIndex + 1);
                if (newIndex !== currentIndex) {
                    const reordered = [...items];
                    const [removed] = reordered.splice(currentIndex, 1);
                    reordered.splice(newIndex, 0, removed);
                    onReorder(reordered);
                }
            }
        },
        [items, keyboardSelectedItem, onReorder]
    );

    return {
        draggedItem,
        dragOverItem,
        keyboardSelectedItem,
        onDragStart,
        onDragOver,
        onDrop,
        onDragEnd,
        onKeyDown,
    };
}
