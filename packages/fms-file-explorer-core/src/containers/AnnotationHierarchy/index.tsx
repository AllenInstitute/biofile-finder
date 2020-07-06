import * as classNames from "classnames";
import * as React from "react";
import { useSelector } from "react-redux";

import DnDList from "../../components/DnDList";
import HierarchyListItem from "./HierarchyListItem";
import * as annotationSelectors from "../AnnotationSidebar/selectors";

const styles = require("./AnnotationHierarchy.module.css");

export const DROPPABLE_ID = "HIERARCHY_LIST";

interface AnnotationHierarchyProps {
    className?: string;
    highlightDropZone: boolean;
}

/**
 * Ordered listing of metadata annotations (a.k.a., "keys", "attributes", etc) that a user has selected by which to group files in the FileList.
 * A user can drag an annotation from AnnotationList into this component, and can later reorder the annotations already dropped into the component.
 */
export default function AnnotationHierarchy(props: AnnotationHierarchyProps) {
    const { className, highlightDropZone } = props;
    const annotationHierarchyListItems = useSelector(annotationSelectors.getHierarchyListItems);

    return (
        <div className={classNames(styles.root, className)}>
            <h3 className={styles.title}>Annotation hierarchy</h3>
            <h6 className={styles.description}>
                Files will be grouped by the following annotations
            </h6>
            <DnDList
                className={styles.hierarchy}
                highlight={highlightDropZone}
                id={DROPPABLE_ID}
                items={annotationHierarchyListItems}
                itemRenderer={HierarchyListItem}
                loading={false}
            />
        </div>
    );
}
