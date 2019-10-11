import * as classNames from "classnames";
import * as React from "react";

const styles = require("./style.module.css");

interface HeaderRibbonProps {
    className?: string;
}

export default function HeaderRibbon(props: HeaderRibbonProps) {
    return <div className={classNames(styles.root, props.className)}></div>;
}
