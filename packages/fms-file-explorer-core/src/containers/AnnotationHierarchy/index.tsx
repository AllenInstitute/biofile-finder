import * as classNames from "classnames";
import * as React from "react";
import { DndProvider } from "react-dnd";
import HTML5Backend from "react-dnd-html5-backend";

import AnnotationList from "../AnnotationList";
const styles = require("./AnnotationHierarchy.module.css");

interface AnnotationHierarchyProps {
    className?: string;
}

/**
 * Container for features related to viewing available metadata annotations, selecting and ordering those annotations
 * by which to group files by, and filtering/sorting those annotations.
 */
export default function AnnotationHierarchy(props: AnnotationHierarchyProps) {
    return (
        <div className={classNames(styles.root, props.className)}>
            <DndProvider backend={HTML5Backend}>
                <div className={styles.annotationGrouping}></div>
                <AnnotationList className={styles.annotationList} />
            </DndProvider>
        </div>
    );
}
