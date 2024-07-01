import { ChoiceGroup } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import ListPicker from "../../ListPicker";
import { ListItem } from "../../ListPicker/ListRow";
import SearchBox from "../../SearchBox";
import FileFilter from "../../../entity/FileFilter";

import styles from "./SearchBoxForm.module.css";

interface SearchBoxFormProps {
    className?: string;
    items: ListItem[];
    title?: string;
    onDeselect: (item: ListItem) => void;
    onDeselectAll: () => void;
    onSelect: (item: ListItem) => void;
    onSelectAll: () => void;
    onSearch: (filterValue: string) => void;
    onToggleFuzzySearch: () => void;
    fieldName: string;
    fuzzySearchEnabled?: boolean;
    defaultValue: FileFilter | undefined;
}

/**
 * This component renders a simple form for searching on text values
 * or selecting indiviudal items via the ListPicker
 */
export default function SearchBoxForm(props: SearchBoxFormProps) {
    const [isListPicking, setIsListPicking] = React.useState(false);
    const [isFuzzySearching, setIsFuzzySearching] = React.useState(
        props?.fuzzySearchEnabled || false
    );
    const defaultSearchBox = props?.fuzzySearchEnabled ? "search-box-fuzzy" : "search-box-exact";

    function onSearchSubmitted(value: string) {
        // Make sure fuzzy search is synchronized in state
        if (isFuzzySearching !== props?.fuzzySearchEnabled) {
            props.onToggleFuzzySearch();
        }
        props.onSearch(value);
    }

    return (
        <div className={classNames(props.className, styles.container)}>
            <h3 className={styles.title}>{props.title}</h3>
            <ChoiceGroup
                className={styles.choiceGroup}
                label="Filter type"
                defaultSelectedKey={isListPicking ? "list-picker" : defaultSearchBox}
                options={[
                    {
                        key: "search-box-exact",
                        text: "Exact match search",
                    },
                    {
                        key: "search-box-fuzzy",
                        text: "Partial match search",
                    },
                    {
                        key: "list-picker",
                        text: "List picker",
                        disabled: props.items.length === 0,
                    },
                ]}
                onChange={(_, selection) => {
                    // Clear the selection if the user switches to the search box
                    // and the default value is not in the list (i.e. not deselectable)
                    if (
                        selection?.key === "list-picker" &&
                        props.defaultValue &&
                        !props.items.some((item) => item.selected)
                    ) {
                        props.onDeselectAll();
                    }
                    setIsFuzzySearching(selection?.key === "search-box-fuzzy");
                    setIsListPicking(selection?.key === "list-picker");
                }}
            />
            {isListPicking ? (
                <ListPicker
                    className={styles.listPicker}
                    items={props.items}
                    onDeselect={props.onDeselect}
                    onDeselectAll={props.onDeselectAll}
                    onSelect={props.onSelect}
                    onSelectAll={props.onSelectAll}
                />
            ) : (
                <div data-is-focusable="true">
                    <SearchBox
                        defaultValue={props.defaultValue}
                        onReset={props.onDeselectAll}
                        onSearch={onSearchSubmitted}
                        placeholder={`Search by ${props.fieldName}`}
                    />
                </div>
            )}
        </div>
    );
}
