import * as classNames from "classnames";
import * as React from "react";

const styles = require("./style.module.css");

interface FileDetails {
    className?: string;
}

/**
 * Right-hand sidebar of application. Displays details of selected file(s).
 */
export default function FileDetails(props: FileDetails) {
    return <div className={classNames(styles.root, props.className)}></div>;
}
