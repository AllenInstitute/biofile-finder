import * as classNames from "classnames";
import * as React from "react";

const styles = require("./style.module.css");

interface BreadcrumbsProps {
    className?: string;
}

export default function Breadcrumbs(props: BreadcrumbsProps) {
    return <div className={classNames(styles.root, props.className)}></div>;
}
