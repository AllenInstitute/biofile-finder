import classNames from "classnames";
import * as React from "react";
import { DragDropContext, OnDragEndResponder, OnDragStartResponder } from "react-beautiful-dnd";
import { useDispatch } from "react-redux";

import AnnotationHierarchy from "../AnnotationHierarchy";
import AnnotationList, { DROPPABLE_ID as ANNOTATION_LIST_DROPPABLE_ID } from "../AnnotationList";

import { selection } from "../../state";

const styles = require("./AnnotationSidebar.module.css");

interface AnnotationSidebarProps {
    className?: string;
}

/**
 * Container for features related to viewing available metadata annotations, selecting and ordering those annotations
 * by which to group files by, and filtering/sorting those annotations.
 */
export default function AnnotationSidebar(props: AnnotationSidebarProps) {
    const [highlightDropZone, setHighlightDropZone] = React.useState(false);
    const dispatch = useDispatch();

    // On drag start of any draggable item within this DragDropContext, if the draggable comes from the list of all
    // available annotations, show indicator of where the user can drop it
    const onDragStart: OnDragStartResponder = (start) => {
        if (start.source.droppableId === ANNOTATION_LIST_DROPPABLE_ID) {
            setHighlightDropZone(true);
        }
    };

    // On drag end of any draggable item within this DragDropContext, if it was dropped on the hierarchy list, tell Redux about it
    const onDragEnd: OnDragEndResponder = (result) => {
        const { destination, draggableId, source } = result;
        const { itemId } = JSON.parse(draggableId);

        // dropped within drag and drop context
        if (destination) {
            if (source.droppableId === ANNOTATION_LIST_DROPPABLE_ID) {
                // the draggable came from the list of all available annotations and was dropped on the hierarchy
                dispatch(selection.actions.reorderAnnotationHierarchy(itemId, destination.index));
            } else {
                // in every other case, the draggable came from the hierarchy itself (i.e., the hierarchy was reordered)
                dispatch(selection.actions.reorderAnnotationHierarchy(itemId, destination.index));
            }
        }

        // drag is finished, so if showDropZone is true, toggle the flag
        if (highlightDropZone) {
            setHighlightDropZone(false);
        }
    };

    return (
        <div className={classNames(styles.root, props.className)}>
            <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
                {/* <FileSetSourceSelector className={styles.dataSourceSelector} /> */}
                <AnnotationHierarchy
                    className={styles.annotationHierarchy}
                    highlightDropZone={highlightDropZone}
                />
                <AnnotationList className={styles.annotationList} />
            </DragDropContext>
        </div>
    );
}
