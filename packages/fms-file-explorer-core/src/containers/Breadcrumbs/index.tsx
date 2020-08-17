import classNames from "classnames";
import * as React from "react";

const styles = require("./style.module.css");

interface BreadcrumbsProps {
    className?: string;
}

/**
 * View of current annotation hierarchy applied. Surfaces feature for copying a shareable link.
 */
export default function Breadcrumbs(props: BreadcrumbsProps) {
    return <div className={classNames(styles.root, props.className)}></div>;
}
