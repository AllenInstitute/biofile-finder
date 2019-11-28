import * as classNames from "classnames";
import * as React from "react";
import { DndProvider } from "react-dnd-cjs";
import HTML5Backend from "react-dnd-html5-backend-cjs";

import AnnotationList from "../AnnotationList";
import HierarchyBuilder from "./HierarchyBuilder";
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
                <HierarchyBuilder className={styles.annotationGrouping} />
                <AnnotationList className={styles.annotationList} />
            </DndProvider>
        </div>
    );
}
