import * as classNames from "classnames";
import * as React from "react";

const styles = require("./style.module.css");

interface FileDetails {
    className?: string;
}

export default function FileDetails(props: FileDetails) {
    return <div className={classNames(styles.root, props.className)}></div>;
}
