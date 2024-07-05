import {
    DirectionalHint,
    IContextualMenuItem,
    IContextualMenuListProps,
    IRenderFunction,
    PrimaryButton,
} from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { DragDropContext, OnDragEndResponder } from "react-beautiful-dnd";

import QueryPartRow, { QueryPartRowItem } from "./QueryPartRow";
import { useButtonMenu } from "../Buttons";
import DnDList from "../DnDList";

import styles from "./QueryPart.module.css";

interface Props {
    title: string;
    titleIconName?: string;
    disabled?: boolean;
    tutorialId?: string;
    rows: QueryPartRowItem[];
    onClick?: (itemId: string) => void;
    onDelete?: (itemId: string) => void;
    onReorder?: (itemId: string, destinationIndex: number) => void;
    addMenuListItems?: IContextualMenuItem[];
    onRenderAddMenuList?: IRenderFunction<IContextualMenuListProps>;
    onRenderEditMenuList?: (item: QueryPartRowItem) => React.ReactElement<QueryPartRowItem>;
}

/**
 * Component of an individual query in the query sidebar
 */
export default function QueryPart(props: Props) {
    const addButtonMenu = useButtonMenu({
        shouldFocusOnMount: true,
        directionalHint: DirectionalHint.rightTopEdge,
        onRenderMenuList: props.onRenderAddMenuList,
        // necessary to have a non-empty items list to have `onRenderMenuList` called
        items: props.addMenuListItems || [{ key: "placeholder" }],
    });

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
            <PrimaryButton
                ariaLabel={`Add ${props.title}`}
                disabled={props.disabled}
                className={styles.addButton}
                id={props.tutorialId}
                menuIconProps={{ iconName: "Add" }}
                text={props.title}
                menuProps={addButtonMenu}
            />
            <DragDropContext onDragEnd={onDragEnd}>
                {!!props.rows.length && (
                    <DnDList
                        id={props.title}
                        items={props.rows.map((row) => ({
                            ...row,
                            titleIconName: props.titleIconName,
                            onClick: props.onClick,
                            onDelete: props.onDelete,
                            disabled: !props.onReorder,
                            onRenderEditMenuList: props.onRenderEditMenuList,
                        }))}
                        itemRenderer={QueryPartRow}
                    />
                )}
            </DragDropContext>
        </div>
    );
}
