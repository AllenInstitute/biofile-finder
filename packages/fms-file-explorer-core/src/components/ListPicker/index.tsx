import { ActionButton, List, SearchBox, Spinner, SpinnerSize } from "@fluentui/react";
import Fuse from "fuse.js";
import { noop } from "lodash";
import * as React from "react";

import { AnnotationValue } from "../../services/AnnotationService";

const styles = require("./ListPicker.module.css");

export interface ListItem {
    checked: boolean;
    displayValue: AnnotationValue;
    value: AnnotationValue;
}

interface ListPickerProps {
    errorMessage?: string;
    items: ListItem[];
    loading?: boolean;
    onDeselect: (item: ListItem) => void;
    onDeselectAll?: () => void;
    onSelect: (item: ListItem) => void;
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
    const { errorMessage, items, loading, onDeselect, onDeselectAll, onSelect } = props;

    const [searchValue, setSearchValue] = React.useState("");

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

    let resetButton = null;
    if (onDeselectAll) {
        resetButton = (
            <ActionButton ariaLabel="Reset" className={styles.actionButton} onClick={onDeselectAll}>
                Reset
            </ActionButton>
        );
    }

    return (
        <div className={styles.container} data-is-scrollable="true" data-is-focusable="true">
            <div className={styles.header}>
                <SearchBox
                    className={styles.searchBox}
                    onChange={onSearchBoxChange}
                    onClear={() => setSearchValue("")}
                    styles={SEARCH_BOX_STYLE_OVERRIDES}
                />
                {resetButton}
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
                                onChange={(event) => {
                                    if (event.target.checked) {
                                        onSelect(item);
                                    } else {
                                        onDeselect(item);
                                    }
                                }}
                            />
                            {item.displayValue}
                        </label>
                    )
                }
            />
        </div>
    );
}
