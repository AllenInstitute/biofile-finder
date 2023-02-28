import { ActionButton, List, SearchBox, Spinner, SpinnerSize } from "@fluentui/react";
import classNames from "classnames";
import Fuse from "fuse.js";
import * as React from "react";

import { AnnotationValue } from "../../services/AnnotationService";

import styles from "./ListPicker.module.css";

export interface ListItem<T = any> {
    selected: boolean;
    displayValue: AnnotationValue;
    value: AnnotationValue;
    data?: T; // optional "user data" to stash on a list item to retrieve later
}

interface ListPickerProps {
    disabled?: boolean;
    errorMessage?: string;
    items: ListItem[];
    loading?: boolean;
    onDeselect: (item: ListItem) => void;
    onDeselectAll?: () => void;
    onSelect: (item: ListItem) => void;
    onSelectAll?: () => void;
}

const FUZZY_SEARCH_OPTIONS = {
    // which keys on FilterItem to search
    keys: [{ name: "displayValue", weight: 1.0 }],

    // return resulting matches sorted
    shouldSort: true,

    // arbitrarily tuned; 0.0 requires a perfect match, 1.0 would match anything
    threshold: 0.3,
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
    const {
        errorMessage,
        items,
        loading,
        onDeselect,
        onDeselectAll,
        onSelect,
        onSelectAll,
    } = props;

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

    const hasSelectedItem = React.useMemo(() => items.find((item) => item.selected), [items]);

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
        <div className={styles.container} data-is-scrollable="true" data-is-focusable="true">
            <div className={styles.header}>
                <SearchBox
                    className={styles.searchBox}
                    disabled={props.disabled}
                    onChange={onSearchBoxChange}
                    onClear={() => setSearchValue("")}
                    styles={SEARCH_BOX_STYLE_OVERRIDES}
                />
                <div className={styles.buttons}>
                    {onSelectAll && (
                        <ActionButton
                            ariaLabel="Select All"
                            className={classNames(
                                {
                                    [styles.disabled]: filteredItems.length > 100,
                                },
                                styles.actionButton
                            )}
                            disabled={filteredItems.length > 100}
                            title={
                                filteredItems.length > 100
                                    ? "Too many options to select at once"
                                    : undefined
                            }
                            onClick={onSelectAll}
                        >
                            Select All
                        </ActionButton>
                    )}
                    <ActionButton
                        ariaLabel="Reset"
                        className={classNames(
                            {
                                [styles.disabled]: !hasSelectedItem,
                            },
                            styles.actionButton
                        )}
                        disabled={!hasSelectedItem}
                        title={hasSelectedItem ? undefined : "No options selected"}
                        onClick={onDeselectAll}
                    >
                        Reset
                    </ActionButton>
                </div>
            </div>
            <List
                getKey={(item) => String(item.value)}
                ignoreScrollingState={true}
                items={filteredItems}
                onShouldVirtualize={() => filteredItems.length > 100}
                onRenderCell={(item) =>
                    item && (
                        <label className={styles.item}>
                            <input
                                className={styles.checkbox}
                                disabled={props.disabled}
                                type="checkbox"
                                role="checkbox"
                                name={String(item.value)}
                                value={String(item.value)}
                                checked={item.selected}
                                aria-checked={item.selected}
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
            <div className={styles.footer}>
                <h6>
                    Displaying {filteredItems.length} of {items.length} Options
                </h6>
            </div>
        </div>
    );
}
