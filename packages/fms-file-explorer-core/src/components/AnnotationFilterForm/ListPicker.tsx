import * as Fuse from "fuse.js";
import { ActionButton, List, SearchBox, Spinner, SpinnerSize } from "office-ui-fabric-react";
import * as React from "react";

import { FilterItem } from "./";
import { AnnotationValue } from "../../services/AnnotationService";

const styles = require("./ListPicker.module.css");

interface ListPickerProps {
    errorMessage: string | undefined;
    items: FilterItem[];
    loading: boolean;
    onDeselect: (value: AnnotationValue | AnnotationValue[]) => void;
    onSelect: (value: AnnotationValue | AnnotationValue[]) => void;
}

const FUZZY_SEARCH_OPTIONS = {
    // which keys on FilterItem to search
    keys: [
        { name: "displayValue", weight: 0.7 },
        { name: "value", weight: 0.3 },
    ],

    // return resulting matches sorted
    shouldSort: true,

    // arbitrarily tuned; 0.0 requires a perfect match, 1.0 would match anything
    threshold: 0.1,
};

const SEARCH_BOX_STYLE_OVERRIDES = {
    icon: {
        color: "steelblue",
    },
};

/**
 * A ListPicker is a simple form that renders a list of items and allows a user to select and
 * deselect those items. It also provides rudimentary fuzzy search capabilities for searching through
 * its items. See `FUZZY_SEARCH_OPTIONS` for how that feature is configured.
 *
 * It is best suited for selecting items that are strings.
 */
export default function ListPicker(props: ListPickerProps) {
    const { errorMessage, items, loading, onDeselect, onSelect } = props;

    const [searchValue, setSearchValue] = React.useState("");

    const onFilterStateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            onSelect(event.target.value);
        } else {
            onDeselect(event.target.value);
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

    if (errorMessage) {
        return <div className={styles.container}>Whoops! Encountered an error: {errorMessage}</div>;
    }

    if (loading) {
        return (
            <div className={styles.container}>
                <Spinner size={SpinnerSize.small} />
            </div>
        );
    }

    return (
        <div className={styles.container} data-is-scrollable="true">
            <div className={styles.header}>
                <SearchBox
                    className={styles.searchBox}
                    onChange={onSearchBoxChange}
                    onClear={() => setSearchValue("")}
                    styles={SEARCH_BOX_STYLE_OVERRIDES}
                />
                <ActionButton
                    ariaLabel="Reset"
                    className={styles.actionButton}
                    onClick={() => onDeselect(items.map((item) => item.value))}
                >
                    Reset
                </ActionButton>
            </div>
            <List
                getKey={(item) => String(item.value)}
                items={filteredItems}
                onShouldVirtualize={() => filteredItems.length > 100}
                onRenderCell={(item) =>
                    item && (
                        <label className={styles.item}>
                            <input
                                className={styles.checkbox}
                                type="checkbox"
                                role="checkbox"
                                name={String(item.value)}
                                value={String(item.value)}
                                checked={item.checked}
                                aria-checked={item.checked}
                                onChange={onFilterStateChange}
                            />
                            {item.displayValue}
                        </label>
                    )
                }
            />
        </div>
    );
}
