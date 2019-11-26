import * as classNames from "classnames";
import * as Fuse from "fuse.js";
import * as React from "react";
import { useSelector } from "react-redux";

import List from "./List";
import SearchIcon from "./SearchIcon";
import * as annotationListSelectors from "./selectors";

const styles = require("./AnnotationList.module.css");

interface AnnotationListProps {
    className?: string;
}

const FUZZY_SEARCH_OPTIONS = {
    // which keys on ListItemData to search
    keys: [{ name: "title", weight: 0.7 }, { name: "description", weight: 0.3 }],

    // return resulting matches sorted
    shouldSort: true,

    // arbitrarily tuned; 0.0 requires a perfect match, 1.0 would match anything
    threshold: 0.2,
};

/**
 * Listing of all metadata annotations (a.k.a., "keys", "attributes", etc). Users can filter the list using the
 * AnnotationFilter input box. Individual annotations can be inspected for their description, and can be dragged into
 * the AnnotationGrouping component in order to effect how files in the FileList are displayed (grouped and filtered).
 */
export default function AnnotationList(props: AnnotationListProps) {
    const annotationListItems = useSelector(annotationListSelectors.getAnnotationListItems);
    const [searchValue, setSearchValue] = React.useState("");

    // Perform fuzzy search using searchValue within annotation list items, considering the items
    // title and description. If no searchValue has been entered, return full list of items.
    const filteredListItems = React.useMemo(() => {
        if (!searchValue) {
            return annotationListItems;
        }

        const fuse = new Fuse(annotationListItems, FUZZY_SEARCH_OPTIONS);
        return fuse.search(searchValue);
    }, [annotationListItems, searchValue]);

    return (
        <div className={classNames(styles.root, props.className)}>
            <h3 className={styles.title}>Available annotations</h3>
            <h6 className={styles.description}>Drag any annotation to the box above</h6>
            <div className={styles.listContainer}>
                <div className={styles.searchBox}>
                    <SearchIcon className={styles.searchIcon} />
                    <input
                        className={styles.filterInput}
                        spellCheck={false}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                            setSearchValue(event.target.value);
                        }}
                        placeholder="Search..."
                        type="search"
                    />
                </div>
                <List className={styles.list} items={filteredListItems} />
            </div>
        </div>
    );
}
