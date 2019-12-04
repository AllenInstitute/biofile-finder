import * as classNames from "classnames";
import * as React from "react";
import { DragDropContext, OnDragEndResponder, OnDragStartResponder } from "react-beautiful-dnd";
import { useDispatch, useSelector } from "react-redux";

import AnnotationList, { DROPPABLE_ID as ANNOTATION_LIST_DROPPABLE_ID } from "../AnnotationList";
import * as annotationSelectors from "./selectors";
import DnDList from "../../components/DnDList";
import HierarchyListItem from "./HierarchyListItem";
import { selection } from "../../state";

const styles = require("./AnnotationHierarchy.module.css");

interface AnnotationHierarchyProps {
    className?: string;
}

const HIERARCHY_LIST_DROPPABLE_ID = "HIERARCHY_LIST";

/**
 * Container for features related to viewing available metadata annotations, selecting and ordering those annotations
 * by which to group files by, and filtering/sorting those annotations.
 */
export default function AnnotationHierarchy(props: AnnotationHierarchyProps) {
    const annotationHierarchyListItems = useSelector(annotationSelectors.getHierarchyListItems);
    const annotationListItems = useSelector(annotationSelectors.getAnnotationListItems);
    const [showDropZone, setShowDropZone] = React.useState(false);
    const dispatch = useDispatch();

    // On drag start of any draggable item within this DragDropContext, if the draggable comes from the list of all
    // available annotations, show indicator of where the user can drop it
    const onDragStart: OnDragStartResponder = (start) => {
        if (start.source.droppableId === ANNOTATION_LIST_DROPPABLE_ID) {
            setShowDropZone(true);
        }
    };

    // On drag end of any draggable item within this DragDropContext, if it was dropped on the hierarchy list, tell Redux about it
    const onDragEnd: OnDragEndResponder = (result) => {
        const { source, destination } = result;

        // dropped within drag and drop context
        if (destination) {
            switch (source.droppableId) {
                // the draggable came from the list of all available annotations and was dropped on the hierarchy
                case ANNOTATION_LIST_DROPPABLE_ID:
                    dispatch(
                        selection.actions.reorderAnnotationHierarchy(
                            annotationListItems[source.index].id,
                            destination.index
                        )
                    );
                    break;
                // in every other case, the draggable came from the hierarchy itself (i.e., the hierarchy was reordered)
                default:
                    dispatch(
                        selection.actions.reorderAnnotationHierarchy(
                            annotationHierarchyListItems[source.index].id,
                            destination.index
                        )
                    );
                    break;
            }
        }

        // drag is finished, so if showDropZone is true, toggle the flag
        if (showDropZone) {
            setShowDropZone(false);
        }
    };

    return (
        <div className={classNames(styles.root, props.className)}>
            <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
                <DnDList
                    className={styles.annotationGrouping}
                    highlight={showDropZone}
                    id={HIERARCHY_LIST_DROPPABLE_ID}
                    items={annotationHierarchyListItems}
                    itemRenderer={HierarchyListItem}
                />
                <AnnotationList className={styles.annotationList} />
            </DragDropContext>
        </div>
    );
}
