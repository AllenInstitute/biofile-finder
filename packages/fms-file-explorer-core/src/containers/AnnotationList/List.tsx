import * as classNames from "classnames";
import { map } from "lodash";
import * as React from "react";
import { Droppable, Draggable } from "react-beautiful-dnd";

import ListItem, { ListItemData } from "./ListItem";

const styles = require("./List.module.css");

interface ListProps {
    className?: string;
    items: ListItemData[];
}

/**
 * Fundamental list component rendered by AnnotationList. Separated from AnnotationList simply to keep files small and
 * components as single-purpose as possible.
 */
export default function List(props: ListProps) {
    return (
        <Droppable droppableId="ANNOTATION_LIST" isDropDisabled={true}>
            {(droppableProvided) => (
                <ul
                    ref={droppableProvided.innerRef}
                    className={classNames(styles.list, props.className)}
                >
                    {map(props.items, (item, index) => (
                        <Draggable key={item.id} draggableId={`LIST_ITEM_${item.id}`} index={index}>
                            {(draggableProvided, draggableSnapshot) => (
                                <>
                                    <ListItem
                                        ref={draggableProvided.innerRef}
                                        data={item}
                                        draggableProps={draggableProvided.draggableProps}
                                        dragHandleProps={draggableProvided.dragHandleProps}
                                        isDragging={draggableSnapshot.isDragging}
                                    />
                                    {draggableSnapshot.isDragging && (
                                        <ListItem
                                            className={styles.listItemPlaceholder}
                                            data={item}
                                            isDragging={draggableSnapshot.isDragging}
                                        />
                                    )}
                                </>
                            )}
                        </Draggable>
                    ))}
                    {droppableProvided.placeholder}
                </ul>
            )}
        </Droppable>
    );
}
