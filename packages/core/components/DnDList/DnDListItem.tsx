import classNames from "classnames";
import * as React from "react";
import {
    DraggableProvidedDraggableProps,
    DraggableProvidedDragHandleProps,
} from "react-beautiful-dnd";

import styles from "./DnDListItem.module.css";

interface DnDListItemProps {
    className?: string;
    draggableProps?: DraggableProvidedDraggableProps;
    dragHandleProps?: DraggableProvidedDragHandleProps | null;
}

/**
 * A draggable and droppable list item intended to be rendered within DndList.
 */
function DnDListItem(
    props: React.PropsWithChildren<DnDListItemProps>,
    ref?: React.Ref<HTMLLIElement>
) {
    const { children, className, draggableProps, dragHandleProps } = props;

    return (
        <li
            className={classNames(styles.row, className)}
            ref={ref}
            {...(draggableProps || {})}
            {...(dragHandleProps || {})}
        >
            {children}
        </li>
    );
}

export default React.forwardRef<HTMLLIElement, React.PropsWithChildren<DnDListItemProps>>(
    DnDListItem
);
