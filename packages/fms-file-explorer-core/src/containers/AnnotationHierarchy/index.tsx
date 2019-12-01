import * as classNames from "classnames";
import * as React from "react";
import { DragDropContext, OnDragEndResponder } from "react-beautiful-dnd";
import { useDispatch, useSelector } from "react-redux";

import AnnotationList from "../AnnotationList";
import * as annotationListSelectors from "../AnnotationList/selectors";
import HierarchyBuilder from "./HierarchyBuilder";
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
    const annotationListItems = useSelector(annotationListSelectors.getAnnotationListItems);
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
                        annotationListItems[source.index].id
                    )
                );
                console.log("hit non-default case");
                break;
            default:
                console.log("hit default case");
                break;
        }
    };

    return (
        <div className={classNames(styles.root, props.className)}>
            <DragDropContext onDragEnd={onDragEnd}>
                <HierarchyBuilder className={styles.annotationGrouping} />
                <AnnotationList className={styles.annotationList} />
            </DragDropContext>
        </div>
    );
}
