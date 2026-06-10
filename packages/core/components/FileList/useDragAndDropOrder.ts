import * as React from "react";

/**
 * Custom React hook that encapsulates all logic for drag-and-drop (mouse)
 * reordering of a list of string-keyed items.
 *
 * Returns event handlers to attach to each item and state values for visual feedback.
 *
 * @param items   Ordered list of string keys representing the items that can be reordered.
 * @param onReorder  Callback invoked with the newly-ordered list of keys whenever the order changes.
 */
export default function useDragAndDropOrder(
    items: string[],
    onReorder: (item: string, moveTo: number) => void
) {
    const [draggedItem, setDraggedItem] = React.useState<string | null>(null);
    const [dragOverItem, setDragOverItem] = React.useState<string | null>(null);

    const onDragStart = React.useCallback((itemKey: string) => {
        setDraggedItem(itemKey);
    }, []);

    const onDragOver = React.useCallback(
        (e: React.DragEvent, itemKey: string) => {
            e.preventDefault();
            setDragOverItem(itemKey !== draggedItem ? itemKey : null);
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
            const toIndex = items.indexOf(targetKey);
            onReorder(draggedItem, toIndex);
            setDraggedItem(null);
            setDragOverItem(null);
        },
        [draggedItem, items, onReorder]
    );

    const onDragEnd = React.useCallback(() => {
        setDraggedItem(null);
        setDragOverItem(null);
    }, []);

    return {
        draggedItem,
        dragOverItem,
        onDragStart,
        onDragOver,
        onDrop,
        onDragEnd,
    };
}
