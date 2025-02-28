import { Shimmer } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { Droppable, Draggable } from "react-beautiful-dnd";

import DnDListItem from "./DnDListItem";

import styles from "./DnDList.module.css";

export const DND_LIST_CONTAINER_ID = "dnd-list-container-id";

export interface DnDItem {
    disabled?: boolean;
    id: string; // a unique identifier for the annotation, e.g., annotation.name
    title: string; // the value to display, e.g., annotation.displayName
    type?: string;
    isFileProperty?: boolean;
}

export interface DnDListDividers {
    [index: number]: JSX.Element;
}

export interface DnDItemRendererParams {
    index: number;
    item: DnDItem;
    loading?: boolean;
}

interface DnDListProps {
    className?: string;
    highlight?: boolean;
    id: string;
    isDropDisabled?: boolean;
    items: DnDItem[];
    itemRenderer: React.FunctionComponent<DnDItemRendererParams>;
    loading?: boolean;
    dividers?: DnDListDividers;
}

/**
 * Wrapper for react-beautiful-dnd that renders a list of items that are draggable and droppable.
 */
export default function DnDList(props: DnDListProps) {
    const { highlight, id, isDropDisabled, items, itemRenderer, loading, dividers } = props;

    let listItems: JSX.Element[];
    if (loading && !items.length) {
        listItems = Array(30).map((_, idx) => <Shimmer key={idx} />);
    } else {
        listItems = items.reduce(
            (accum, item, index) => [
                ...accum,
                ...(dividers && dividers[index] ? [dividers[index]] : []),
                <Draggable
                    key={item.id}
                    draggableId={JSON.stringify({ sourceId: id, itemId: item.id })}
                    index={index}
                    isDragDisabled={item.disabled}
                >
                    {(draggableProps, draggableState) => (
                        <>
                            <DnDListItem
                                ref={draggableProps.innerRef}
                                draggableProps={draggableProps.draggableProps}
                                dragHandleProps={draggableProps.dragHandleProps}
                            >
                                {React.createElement(itemRenderer, {
                                    index,
                                    item,
                                    loading,
                                })}
                            </DnDListItem>
                            {
                                // Render static clone of item (i.e., not draggable) in a non-droppable list to prevent react-beautiful-dnd from leaving a hole in the source list when an item is actively being dragged out of it.
                                // See https://github.com/atlassian/react-beautiful-dnd/issues/216 for context.
                                isDropDisabled && draggableState.isDragging && (
                                    <DnDListItem
                                        className={classNames(
                                            styles.listItemPlaceholder,
                                            styles.disabled
                                        )}
                                    >
                                        {React.createElement(itemRenderer, {
                                            index,
                                            item,
                                            loading,
                                        })}
                                    </DnDListItem>
                                )
                            }
                        </>
                    )}
                </Draggable>,
            ],
            [] as JSX.Element[]
        );
    }

    return (
        <Droppable droppableId={id} isDropDisabled={isDropDisabled}>
            {(droppableProps, droppableState) => (
                <ul
                    ref={droppableProps.innerRef}
                    className={classNames(
                        styles.list,
                        {
                            [styles.dropIndicator]:
                                !isDropDisabled && (highlight || droppableState.isDraggingOver),
                        },
                        props.className
                    )}
                    data-testid={DND_LIST_CONTAINER_ID}
                >
                    {listItems}
                    {droppableProps.placeholder}
                </ul>
            )}
        </Droppable>
    );
}
