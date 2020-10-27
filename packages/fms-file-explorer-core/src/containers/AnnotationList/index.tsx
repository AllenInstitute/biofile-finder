import classNames from "classnames";
import Fuse from "fuse.js";
import { PrimaryButton } from "office-ui-fabric-react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import AnnotationListItem from "./AnnotationListItem";
import DnDList from "../../components/DnDList";
import SvgIcon from "../../components/SvgIcon";
import * as annotationSelectors from "../AnnotationSidebar/selectors";
import selection from "../../state/selection";

const styles = require("./AnnotationList.module.css");

export const DROPPABLE_ID = "ANNOTATION_LIST";

interface AnnotationListProps {
    className?: string;
}

const FUZZY_SEARCH_OPTIONS = {
    // which keys on ListItemData to search
    keys: [
        { name: "title", weight: 0.7 },
        { name: "description", weight: 0.3 },
    ],

    // return resulting matches sorted **by relevance score**
    shouldSort: true,

    // arbitrarily tuned; 0.0 requires a perfect match, 1.0 would match anything
    threshold: 0.2,
};

// Path data for icon taken from Material Design
// Apache License 2.0 (https://github.com/google/material-design-icons/blob/master/LICENSE)
const SEARCH_ICON_PATH_DATA =
    "M9.516 14.016q1.875 0 3.188-1.313t1.313-3.188-1.313-3.188-3.188-1.313-3.188 1.313-1.313 3.188 1.313 3.188 3.188 1.313zM15.516 14.016l4.969 4.969-1.5 1.5-4.969-4.969v-0.797l-0.281-0.281q-1.781 1.547-4.219 1.547-2.719 0-4.617-1.875t-1.898-4.594 1.898-4.617 4.617-1.898 4.594 1.898 1.875 4.617q0 0.984-0.469 2.227t-1.078 1.992l0.281 0.281h0.797z";

/**
 * Listing of all metadata annotations (a.k.a., "keys", "attributes", etc). Users can filter the list using the
 * AnnotationFilter input box. Individual annotations can be inspected for their description, and can be dragged into
 * the AnnotationGrouping component in order to effect how files in the FileList are displayed (grouped and filtered).
 */
export default function AnnotationList(props: AnnotationListProps) {
    const dispatch = useDispatch();
    const filters = useSelector(selection.selectors.getFileFilters);
    const annotationsLoading = useSelector(
        selection.selectors.getAvailableAnnotationsForHierarchyLoading
    );
    const annotationListItems = useSelector(annotationSelectors.getAnnotationListItems);
    const hierarchyListItems = useSelector(annotationSelectors.getHierarchyListItems);
    const nonAvailableAnnotations = useSelector(
        annotationSelectors.getNonAvailableAnnotationsForHierarchy
    );
    const unusableAnnotationsListItems = [...hierarchyListItems, ...nonAvailableAnnotations];
    const [searchValue, setSearchValue] = React.useState("");

    // Perform fuzzy search using searchValue within annotation list items, considering the items
    // title and description. If no searchValue has been entered, return full list of items.
    const filteredListItems = React.useMemo(() => {
        let items = annotationListItems;
        if (searchValue) {
            const fuse = new Fuse(annotationListItems, FUZZY_SEARCH_OPTIONS);
            items = fuse.search(searchValue);
        }

        return items;
    }, [annotationListItems, searchValue]);

    const onClearFilters = () => {
        dispatch(selection.actions.removeFileFilter(filters));
    };

    return (
        <div className={classNames(styles.root, props.className)}>
            <h3 className={styles.title}>Available annotations</h3>
            <h6 className={styles.description}>Drag any annotation to the box above</h6>
            <div className={styles.listContainer}>
                <div className={styles.searchBox}>
                    <SvgIcon
                        className={styles.searchIcon}
                        height={17}
                        pathData={SEARCH_ICON_PATH_DATA}
                        viewBox="0 0 24 24"
                        width={17}
                    />
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
                <DnDList
                    className={styles.list}
                    disabledItems={unusableAnnotationsListItems}
                    items={filteredListItems}
                    id={DROPPABLE_ID}
                    isDropDisabled={true}
                    itemRenderer={AnnotationListItem}
                    loading={annotationsLoading}
                />
            </div>
            <PrimaryButton
                className={styles.clearFiltersButton}
                disabled={!filters.length}
                text="Clear All Filters"
                onClick={onClearFilters}
            />
        </div>
    );
}
