import classNames from "classnames";
import * as React from "react";

import Checkbox from "../../Checkbox";
import { ListItem } from "../../ListPicker/ListRow";
import SearchBox from "../../SearchBox";
import FileFilter, { FilterType } from "../../../entity/FileFilter";

import styles from "./SearchBoxForm.module.css";

interface SearchBoxFormProps {
    className?: string;
    items?: ListItem[];
    title?: string;
    onDeselect?: (item: ListItem) => void;
    onDeselectAll: () => void;
    onSelect?: (item: ListItem) => void;
    onSelectAll: () => void;
    onSearch: (filterValue: string, type: FilterType) => void;
    fieldName: string;
    fuzzySearchEnabled?: boolean;
    hideFuzzyToggle?: boolean;
    defaultValue: FileFilter | undefined;
}

/**
 * This component renders a simple form for searching on text values
 * with a toggle for exact vs fuzzy (non-exact) search matching
 */
export default function SearchBoxForm(props: SearchBoxFormProps) {
    const [isFuzzySearching, setIsFuzzySearching] = React.useState(!!props?.fuzzySearchEnabled);

    function onSearchSubmitted(value: string) {
        props.onSearch(value, isFuzzySearching ? FilterType.FUZZY : FilterType.DEFAULT);
    }

    return (
        <div className={classNames(props.className, styles.container)}>
            <h3 className={styles.title}>{props.title}</h3>
            <Checkbox
                className={classNames(styles.checkbox, {
                    // [styles.checkboxHidden]: !!props?.hideFuzzyToggle,
                })}
                initialValue={isFuzzySearching}
                onChange={(ev, isChecked) => setIsFuzzySearching(!!isChecked)}
                label="Fuzzy search (non-exact matching)"
                title={isFuzzySearching ? "Turn off fuzzy search" : "Turn on fuzzy search"}
            />
            <SearchBox
                defaultValue={props.defaultValue}
                onReset={props.onDeselectAll}
                onSearch={onSearchSubmitted}
                placeholder={"Search..."}
                showSubmitButton={true}
            />
        </div>
    );
}
