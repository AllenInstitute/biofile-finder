import { Icon } from "@fluentui/react";
import * as React from "react";

import styles from "./EmptyFileListMessage.module.css";

export default function EmptyFileListMessage() {
    return (
        <div className={styles.emptyFileListContainer}>
            <div className={styles.emptyFileListMessage}>
                <Icon className={styles.emptySearchIcon} iconName="SearchIssue" />
                <h2>Sorry! No files found</h2>
                <br />
                <div>We couldn&apos;t find any files matching your request.</div>
                <br />
                <div>
                    Double check your filters for any issues and then contact the software team via
                    <a
                        className={styles.link}
                        href="https://github.com/AllenInstitute/biofile-finder/issues"
                        target="_blank"
                        rel="noreferrer"
                    >
                        &nbsp;GitHub&nbsp;
                    </a>
                    if you still expect there to be matches present.
                </div>
            </div>
        </div>
    );
}
