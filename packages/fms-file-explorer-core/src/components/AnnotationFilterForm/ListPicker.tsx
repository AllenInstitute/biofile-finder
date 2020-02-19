import * as Fuse from "fuse.js";
import { ActionButton, List, SearchBox } from "office-ui-fabric-react";
import * as React from "react";

import { AnnotationValue } from "../../entity/Annotation";
import FilterValue from "./FilterValue";
import { FilterItem } from "./selectors";

const styles = require("./ListPicker.module.css");

interface ListPickerProps {
    items: FilterItem[];
    onDeselect: (value: AnnotationValue | AnnotationValue[]) => void;
    onSelect: (value: AnnotationValue | AnnotationValue[]) => void;
}

const FUZZY_SEARCH_OPTIONS = {
    // which keys on ListItemData to search
    keys: [{ name: "displayValue", weight: 0.7 }, { name: "value", weight: 0.3 }],

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

export default function ListPicker(props: ListPickerProps) {
    const { items, onDeselect, onSelect } = props;

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

    return (
        <div className={styles.container} data-is-scrollable="true">
            <div className={styles.header}>
                <SearchBox
                    className={styles.searchBox}
                    onChange={onSearchBoxChange}
                    onClear={() => setSearchValue("")}
                    styles={SEARCH_BOX_STYLE_OVERRIDES}
                />
                <div className={styles.actionButtonsContainer}>
                    <ActionButton
                        ariaLabel="Select all"
                        className={styles.actionButton}
                        onClick={() => onSelect(items.map((item) => item.value))}
                    >
                        Select all
                    </ActionButton>
                    <span className={styles.actionButtonSeparator}>/</span>
                    <ActionButton
                        ariaLabel="Deselect all"
                        className={styles.actionButton}
                        onClick={() => onDeselect(items.map((item) => item.value))}
                    >
                        Deselect all
                    </ActionButton>
                </div>
            </div>
            <List
                getKey={(item) => String(item.value)}
                items={filteredItems}
                onShouldVirtualize={() => filteredItems.length > 100}
                onRenderCell={(item) =>
                    item && (
                        <FilterValue
                            checked={item.checked}
                            displayValue={item.displayValue}
                            onChange={onFilterStateChange}
                            value={item.value}
                        />
                    )
                }
            />
        </div>
    );
}
