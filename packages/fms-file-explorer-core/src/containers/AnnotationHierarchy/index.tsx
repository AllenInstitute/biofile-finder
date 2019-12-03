import * as classNames from "classnames";
import * as React from "react";
import { DragDropContext, OnDragEndResponder } from "react-beautiful-dnd";
import { useDispatch, useSelector } from "react-redux";

import AnnotationList from "./AnnotationList";
import * as annotationSelectors from "./selectors";
import DnDList from "../../components/DnDList";
import HierarchyListItem from "./HierarchyListItem";
import { selection } from "../../state";

const styles = require("./AnnotationHierarchy.module.css");

interface AnnotationHierarchyProps {
    className?: string;
}

/**
 * Container for features related to viewing available metadata annotations, selecting and ordering those annotations
 * by which to group files by, and filtering/sorting those annotations.
 */
export default function AnnotationHierarchy(props: AnnotationHierarchyProps) {
    const annotationHierarchyListItems = useSelector(annotationSelectors.getHierarchyListItems);
    const annotationListItems = useSelector(annotationSelectors.getAnnotationListItems);
    const dispatch = useDispatch();

    const onDragEnd: OnDragEndResponder = (result) => {
        const { source, destination } = result;

        // dropped outside of context
        if (!destination) {
            return;
        }

        switch (source.droppableId) {
            case "ANNOTATION_LIST":
                dispatch(
                    selection.actions.modifyAnnotationHierarchy(
                        annotationListItems[source.index].id,
                        destination.index
                    )
                );
                break;
            default:
                dispatch(
                    selection.actions.modifyAnnotationHierarchy(
                        annotationHierarchyListItems[source.index].id,
                        destination.index
                    )
                );
                break;
        }
    };

    return (
        <div className={classNames(styles.root, props.className)}>
            <DragDropContext onDragEnd={onDragEnd}>
                <DnDList
                    className={styles.annotationGrouping}
                    id="HIERARCHY_BUILDER"
                    items={annotationHierarchyListItems}
                    itemRenderer={HierarchyListItem}
                />
                <AnnotationList className={styles.annotationList} />
            </DragDropContext>
        </div>
    );
}
