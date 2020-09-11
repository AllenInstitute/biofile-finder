import classNames from "classnames";
import * as React from "react";

const styles = require("./FileThumbnail.module.css");

interface FileThumbnailProps {
    className?: string;
    uri: string;
}

/**
 * Displays the thumbnail for a file.
 */
export default function FileThumbnail({ className, uri }: FileThumbnailProps) {
    return <img src={uri} className={classNames(styles.fileThumbnail, className)} />;
}
