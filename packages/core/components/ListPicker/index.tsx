import { ActionButton, List, Spinner, SpinnerSize } from "@fluentui/react";
import classNames from "classnames";
import Fuse from "fuse.js";
import * as React from "react";

import ListRow, { ListItem } from "./ListRow";
import SearchBox from "../SearchBox";
import Tooltip from "../Tooltip";

import styles from "./ListPicker.module.css";

interface ListPickerProps {
    id?: string;
    className?: string;
    errorMessage?: string;
    items: ListItem[];
    loading?: boolean;
    title?: string;
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

    const fuse = React.useMemo(() => new Fuse(items, FUZZY_SEARCH_OPTIONS), [items]);
    const filteredItems = React.useMemo(() => {
        const filteredRows = searchValue ? fuse.search(searchValue).map(r => r.item) : items;
        return filteredRows.sort((a, b) => {
            // If selected, sort to the top
            if (a.selected !== b.selected) {
                return a.selected ? -1 : 1;
            }

            // If recent, sort to the top below selected
            if (a.recent !== b.recent) {
                return a.recent ? -1 : 1;
            }

            // If this is a divider, sort to the top below recent
            if (a.isDivider !== b.isDivider) {
                return a.isDivider ? -1 : 1;
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
            className={classNames(styles.container, className, {
                [styles.biggerHeader]: !!props.title,
            })}
            data-is-focusable="true"
            data-testid="list-picker"
        >
            <div className={styles.header}>
                {props.title && <h3>{props.title}</h3>}
                <SearchBox
                    id={props.id}
                    onChange={setSearchValue}
                    onReset={() => setSearchValue("")}
                />
                <div className={styles.buttons}>
                    {onSelectAll && (
                        <Tooltip content={hasUnselectedItem ? undefined : "All options selected"}>
                            <ActionButton
                                ariaLabel="Select all"
                                className={classNames(
                                    {
                                        [styles.disabled]: !hasUnselectedItem,
                                    },
                                    styles.selectAllButton,
                                    styles.actionButton
                                )}
                                disabled={!hasUnselectedItem}
                                iconProps={{ iconName: "MultiSelect" }}
                                onClick={onSelectAll}
                            >
                                Select all
                            </ActionButton>
                        </Tooltip>
                    )}
                    <Tooltip content={hasSelectedItem ? undefined : "No options selected"}>
                        <ActionButton
                            ariaLabel="Clear all"
                            className={classNames(
                                {
                                    [styles.disabled]: !hasSelectedItem,
                                },
                                styles.actionButton
                            )}
                            disabled={!hasSelectedItem}
                            iconProps={{ iconName: "Clear" }}
                            onClick={onDeselectAll}
                        >
                            Clear all
                        </ActionButton>
                    </Tooltip>
                </div>
            </div>
            <div className={styles.mainContent} data-is-scrollable="true">
                <List
                    ignoreScrollingState
                    getKey={(item) => String(item.value)}
                    items={filteredItems}
                    onShouldVirtualize={() => filteredItems.length > 100}
                    onRenderCell={(item) => (
                        <ListRow
                            item={item}
                            onDeselect={onDeselect}
                            onSelect={onSelect}
                            subMenuRenderer={props.subMenuRenderer}
                        />
                    )}
                />
            </div>
            <div className={styles.footer}>
                <p>
                    Displaying {filteredItems.length} of {items.length} Options
                </p>
            </div>
        </div>
    );
}
