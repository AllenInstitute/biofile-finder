import * as classNames from "classnames";
import * as React from "react";

const styles = require("./style.module.css");

interface FileListProps {
    className?: string;
}

/**
 * Central UI dedicated to showing lists of available files in FMS. Can be a flat list in the case that no annotation
 * hierarchies have been applied, or nested in the case that the user has declared how (i.e., by which annotations) the
 * files should be grouped.
 */
export default function FileList(props: FileListProps) {
    return <div className={classNames(styles.root, props.className)}></div>;
}
