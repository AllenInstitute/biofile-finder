import * as classNames from "classnames";
import * as React from "react";

const styles = require("./style.module.css");

interface HeaderRibbonProps {
    className?: string;
}

/**
 * Ribbon-like toolbar at the top of the application to contain features like application-level view options.
 */
export default function HeaderRibbon(props: HeaderRibbonProps) {
    return <div className={classNames(styles.root, props.className)}></div>;
}
