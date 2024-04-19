import {
    ActionButton,
    DefaultButton,
    DirectionalHint,
    Icon,
    List,
    SearchBox,
    Spinner,
    SpinnerSize,
} from "@fluentui/react";
import classNames from "classnames";
import Fuse from "fuse.js";
import * as React from "react";

import { AnnotationValue } from "../../services/AnnotationService";

import styles from "./ListPicker.module.css";

export interface ListItem<T = any> {
    disabled?: boolean;
    loading?: boolean;
    selected: boolean;
    displayValue: AnnotationValue;
    value: AnnotationValue;
    description?: string;
    data?: T; // optional "user data" to stash on a list item to retrieve later
}

interface ListPickerProps {
    className?: string;
    errorMessage?: string;
    items: ListItem[];
    loading?: boolean;
    onDeselect: (item: ListItem) => void;
    onDeselectAll: () => void;
    onSelect: (item: ListItem) => void;
    onSelectAll?: () => void;
    onRenderSubMenuList?: (item: ListItem) => React.ReactNode;
    subMenuRenderer?: (item: ListItem) => React.ReactElement<ListItem>;
}

const FUZZY_SEARCH_OPTIONS = {
    // which keys on FilterItem to search
    keys: [{ name: "displayValue", weight: 1.0 }],

    // return resulting matches sorted
    shouldSort: true,

    // arbitrarily tuned; 0.0 requires a perfect match, 1.0 would match anything
    threshold: 0.3,
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
        className,
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

    const fuse = React.useMemo(() => new Fuse(items, FUZZY_SEARCH_OPTIONS), [items]);
    const filteredItems = React.useMemo(() => {
        const filteredRows = searchValue ? fuse.search(searchValue) : items;
        return filteredRows.sort((a, b) => {
            // If selected, sort to the top
            if (a.selected !== b.selected) {
                return a.selected ? -1 : 1;
            }

            // If disabled, sort to the bottom
            return a.disabled === b.disabled ? 0 : a.disabled ? 1 : -1;
        });
    }, [items, searchValue, fuse]);

    const { hasSelectedItem, hasUnselectedItem } = React.useMemo(
        () =>
            items.reduce(
                (acc, item) => ({
                    hasSelectedItem: acc.hasSelectedItem || item.selected,
                    hasUnselectedItem: acc.hasUnselectedItem || !item.selected,
                }),
                { hasSelectedItem: false, hasUnselectedItem: false }
            ),
        [items]
    );

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
        <div
            className={classNames(styles.container, className)}
            data-is-scrollable="true"
            data-is-focusable="true"
        >
            <div className={styles.header}>
                <SearchBox
                    className={styles.searchBox}
                    onChange={onSearchBoxChange}
                    onClear={() => setSearchValue("")}
                />
                <div className={styles.buttons}>
                    {onSelectAll && (
                        <ActionButton
                            ariaLabel="Select All"
                            className={classNames(
                                {
                                    [styles.disabled]: !hasUnselectedItem,
                                },
                                styles.actionButton
                            )}
                            disabled={!hasUnselectedItem}
                            iconProps={{ iconName: "MultiSelect" }}
                            title={hasUnselectedItem ? undefined : "All options selected"}
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
                        iconProps={{ iconName: "Delete" }}
                        title={hasSelectedItem ? undefined : "No options selected"}
                        onClick={onDeselectAll}
                    >
                        Reset
                    </ActionButton>
                </div>
            </div>
            <div className={styles.mainContent}>
                <List
                    getKey={(item) => String(item.value)}
                    ignoreScrollingState={true}
                    items={filteredItems}
                    onShouldVirtualize={() => filteredItems.length > 100}
                    onRenderCell={(item) =>
                        item && (
                            <DefaultButton
                                className={classNames(styles.itemContainer, {
                                    [styles.selected]: item.selected,
                                    [styles.disabled]: item.disabled,
                                })}
                                menuIconProps={{
                                    iconName: props.subMenuRenderer ? "ChevronRight" : undefined,
                                }}
                                menuProps={
                                    props.subMenuRenderer
                                        ? {
                                              directionalHint: DirectionalHint.rightTopEdge,
                                              shouldFocusOnMount: true,
                                              items: [{ key: "placeholder" }], // necessary to have a non-empty items list to have `onRenderMenuList` called
                                              onRenderMenuList: () =>
                                                  props.subMenuRenderer?.(
                                                      item
                                                  ) as React.ReactElement,
                                          }
                                        : undefined
                                }
                                disabled={item.disabled}
                                onClick={() => (item.selected ? onDeselect(item) : onSelect(item))}
                            >
                                <label className={styles.item} title={item.description}>
                                    <div>{item.selected && <Icon iconName="CheckMark" />}</div>
                                    {item.displayValue}
                                </label>
                                {item.loading && (
                                    <Spinner className={styles.spinner} size={SpinnerSize.small} />
                                )}
                            </DefaultButton>
                        )
                    }
                />
            </div>
            <div className={styles.footer}>
                <h6>
                    Displaying {filteredItems.length} of {items.length} Options
                </h6>
            </div>
        </div>
    );
}
