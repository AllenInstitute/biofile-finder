import * as React from "react";

import styles from "./FileThumbnail.module.css";

interface FileThumbnailProps {
    uri: string;
}

/**
 * Displays the thumbnail for a file.
 */
export default function FileThumbnail({ uri }: FileThumbnailProps) {
    return <img src={uri} className={styles.fileThumbnail} />;
}
