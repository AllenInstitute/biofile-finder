import * as classNames from "classnames";
import * as React from "react";

const styles = require("./style.module.css");

interface AnnotationHierarchyProps {
    className?: string;
}

export default function AnnotationHierarchy(props: AnnotationHierarchyProps) {
    return <div className={classNames(styles.root, props.className)}></div>;
}
