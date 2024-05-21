import {
    DirectionalHint,
    IContextualMenuListProps,
    IRenderFunction,
    PrimaryButton,
} from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { DragDropContext, OnDragEndResponder } from "react-beautiful-dnd";

import QueryPartRow, { QueryPartRowItem } from "./QueryPartRow";
import DnDList from "../DnDList";

import styles from "./QueryPart.module.css";

interface Props {
    title: string;
    disabled?: boolean;
    tutorialId?: string;
    addButtonIconName: string;
    rows: QueryPartRowItem[];
    onDelete?: (itemId: string) => void;
    onReorder?: (itemId: string, destinationIndex: number) => void;
    onRenderAddMenuList?: IRenderFunction<IContextualMenuListProps>;
    onRenderEditMenuList?: (item: QueryPartRowItem) => React.ReactElement<QueryPartRowItem>;
}

/**
 * Component of an individual query in the query sidebar
 */
export default function QueryPart(props: Props) {
    // On drag end of any draggable item within this DragDropContext
    const onDragEnd: OnDragEndResponder = (result) => {
        if (props.onReorder) {
            const { destination, draggableId } = result;
            const { itemId } = JSON.parse(draggableId);

            // dropped within same drag and drop context
            if (destination?.droppableId === props.title) {
                props.onReorder(itemId, destination.index);
            }
        }
    };

    return (
        <div className={classNames(styles.container, { [styles.disabled]: props.disabled })}>
            <div className={styles.header}>
                <PrimaryButton
                    ariaLabel={`Add ${props.title}`}
                    disabled={props.disabled}
                    className={styles.addButton}
                    id={props.tutorialId}
                    iconProps={{ iconName: props.addButtonIconName }}
                    menuIconProps={{ iconName: "ChevronRight" }}
                    text={props.title}
                    menuProps={{
                        directionalHint: DirectionalHint.rightTopEdge,
                        shouldFocusOnMount: true,
                        items: [{ key: "placeholder" }], // necessary to have a non-empty items list to have `onRenderMenuList` called
                        onRenderMenuList: props.onRenderAddMenuList,
                    }}
                />
            </div>
            <DragDropContext onDragEnd={onDragEnd}>
                <DnDList
                    id={props.title}
                    items={props.rows.map((row) => ({
                        ...row,
                        onDelete: props.onDelete,
                        disabled: !props.onReorder,
                        onRenderEditMenuList: props.onRenderEditMenuList,
                    }))}
                    itemRenderer={QueryPartRow}
                />
            </DragDropContext>
        </div>
    );
}
