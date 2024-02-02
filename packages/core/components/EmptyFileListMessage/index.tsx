import * as React from "react";
import styles from "./EmptyFileListMessage.module.css";
import { Icon } from "@fluentui/react";

export default function EmptyFileListMessage() {
    return (
        <div className={styles.emptyFileListContainer}>
            <div className={styles.emptyFileListMessage}>
                <Icon className={styles.emptySearchIcon} iconName="SearchIssue" />
                <h2>Sorry! No files found</h2>
                <h3>
                    Double check your filters for any issues and then contact the software team if
                    you still expect there to be matches present.
                </h3>
            </div>
        </div>
    );
}
