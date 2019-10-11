import * as classNames from "classnames";
import * as React from "react";

const styles = require("./style.module.css");

interface FileListProps {
    className?: string;
}

export default function FileList(props: FileListProps) {
    return <div className={classNames(styles.root, props.className)}></div>;
}
