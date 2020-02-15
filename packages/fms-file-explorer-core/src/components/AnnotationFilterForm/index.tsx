import * as Fuse from "fuse.js";
import { List, SearchBox } from "office-ui-fabric-react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import FileFilter from "../../entity/FileFilter";
import FilterValue from "./FilterValue";
import { makeFilterItemsSelector } from "./selectors";
import { selection, State } from "../../state";

const styles = require("./AnnotationFilterForm.module.css");

interface AnnotationFilterFormProps {
    annotationName: string;
}

const FUZZY_SEARCH_OPTIONS = {
    // which keys on ListItemData to search
    keys: [{ name: "value", weight: 1 }],

    // return resulting matches sorted
    shouldSort: true,

    // arbitrarily tuned; 0.0 requires a perfect match, 1.0 would match anything
    threshold: 0.2,
};

export default function AnnotationFilterForm(props: AnnotationFilterFormProps) {
    const { annotationName } = props;

    const dispatch = useDispatch();
    const getAnnotationValueFilters = React.useMemo(makeFilterItemsSelector, []);
    const items = useSelector((state: State) => getAnnotationValueFilters(state, annotationName));
    const [searchValue, setSearchValue] = React.useState("");

    const onFilterStateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            dispatch(
                selection.actions.addFileFilter(new FileFilter(annotationName, event.target.value))
            );
        } else {
            dispatch(
                selection.actions.removeFileFilter(
                    new FileFilter(annotationName, event.target.value)
                )
            );
        }
    };

    const onSearchBoxChange = (event?: React.ChangeEvent<HTMLInputElement>) => {
        // bizzarely necessary because of typings on SearchBox
        if (event) {
            setSearchValue(event.target.value);
        }
    };

    const filteredItems = React.useMemo(() => {
        if (!searchValue) {
            return items;
        }

        const fuse = new Fuse(items, FUZZY_SEARCH_OPTIONS);
        return fuse.search(searchValue);
    }, [items, searchValue]);

    return (
        <div className={styles.container} data-is-scrollable="true">
            <div className={styles.header}>
                <SearchBox className={styles.searchBox} onChange={onSearchBoxChange} />
            </div>
            <List
                getKey={(item) => String(item.value)}
                items={filteredItems}
                onShouldVirtualize={() => filteredItems.length > 100}
                onRenderCell={(item) =>
                    item && (
                        <FilterValue
                            checked={item.checked}
                            onChange={onFilterStateChange}
                            value={item.value}
                        />
                    )
                }
            />
        </div>
    );
}
