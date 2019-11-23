import * as classNames from "classnames";
import * as React from "react";

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
            <div className={styles.annotationGrouping}></div>
            <AnnotationList className={styles.annotationList} />
        </div>
    );
}
