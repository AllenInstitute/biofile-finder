import * as classNames from "classnames";
import * as React from "react";

import RootLoadingIndicator from "./RootLoadingIndicator";
import useDirectoryHierarchy from "./useDirectoryHierarchy";

const styles = require("./DirectoryTree.module.css");

interface FileListProps {
    className?: string;
}

/**
 * Central UI dedicated to showing lists of available files in FMS. Can be a flat list in the case that no annotation
 * hierarchies have been applied, or nested in the case that the user has declared how (i.e., by which annotations) the
 * files should be grouped. E.g.:
 *
 * [collapsible folder] ScientistA
 *      [collapsible folder] plate123
 *      [collapsible folder] plate456
 *      [collapsible folder] plate789
 * [collapsible folder] ScientistB
 *      [collapsible folder] plate123
 *      [collapsible folder] plate456
 *      [collapsible folder] plate789
 */
export default function DirectoryTree(props: FileListProps) {
    const {
        state: { content, error, isLoading },
    } = useDirectoryHierarchy({ collapsed: false });

    return (
        <div className={classNames(props.className, styles.container)}>
            <RootLoadingIndicator visible={isLoading} />
            <ul className={styles.scrollContainer} role="tree" aria-multiselectable="true">
                {!error && content}
                {error && (
                    <aside className={styles.errorMessage}>
                        <p>Whoops! Something went wrong:</p>
                        <p>{error.message}</p>
                    </aside>
                )}
            </ul>
        </div>
    );
}
