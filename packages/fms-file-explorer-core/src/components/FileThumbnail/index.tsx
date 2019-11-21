import * as React from "react";

const styles = require("./FileThumbnail.module.css");

interface FileThumbnailProps {
    uri: string;
}

/**
 * Displays the thumbnail for a file.
 */
export default function FileThumbnail({ uri }: FileThumbnailProps) {
    return <img src={uri} className={styles.fileThumbnail} />;
}
