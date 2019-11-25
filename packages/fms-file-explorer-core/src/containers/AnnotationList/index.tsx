import * as classNames from "classnames";
import * as React from "react";
import { useSelector } from "react-redux";

import List from "./List";
import * as annotationListSelectors from "./selectors";

const styles = require("./AnnotationList.module.css");

interface AnnotationListProps {
    className?: string;
}

/**
 * Listing of all metadata annotations (a.k.a., "keys", "attributes", etc). Users can filter the list using the
 * AnnotationFilter input box. Individual annotations can be inspected for their description, and can be dragged into
 * the AnnotationGrouping component in order to effect how files in the FileList are displayed (grouped and filtered).
 */
export default function AnnotationList(props: AnnotationListProps) {
    const annotationListItems = useSelector(annotationListSelectors.getAnnotationListItems);

    return (
        <div className={classNames(styles.root, props.className)}>
            <h3 className={styles.title}>Available annotations</h3>
            <h6 className={styles.description}>Drag any annotation to the box above</h6>
            <div className={styles.listContainer}>
                <input className={styles.filterInput} spellCheck={false} type="text" />
                <List className={styles.list} items={annotationListItems} />
            </div>
        </div>
    );
}
