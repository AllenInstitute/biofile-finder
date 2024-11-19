import { Icon } from "@fluentui/react";
import * as React from "react";

import styles from "./EmptyFileListMessage.module.css";

export default function EmptyFileListMessage() {
    return (
        <div className={styles.emptyFileListContainer}>
            <div className={styles.emptyFileListMessage}>
                <Icon className={styles.emptySearchIcon} iconName="SearchIssue" />
                <h2>No files match your query</h2>
                <br />
                <div>Double check your filters for any issues.</div>
                <br />
                <div>
                    Contact us via
                    <a
                        className={styles.link}
                        href="https://github.com/AllenInstitute/biofile-finder/issues"
                        target="_blank"
                        rel="noreferrer"
                    >
                        &nbsp;GitHub&nbsp;
                    </a>
                    if you expect there should be matches present for query.
                </div>
            </div>
        </div>
    );
}
