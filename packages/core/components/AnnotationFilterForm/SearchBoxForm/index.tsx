import { ActionButton, Icon } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import { TransparentIconButton } from "../../Buttons";
import ComboBox from "../../ComboBox";
import SearchBox from "../../SearchBox";
import FileFilter, { FilterType } from "../../../entity/FileFilter";

import styles from "./SearchBoxForm.module.css";

const OPERATOR_OPTIONS = [
    { key: FilterType.DEFAULT, text: "Exactly match" },
    { key: FilterType.FUZZY, text: "Contains" },
];

interface SearchBoxFormProps {
    className?: string;
    filters: FileFilter[];
    onClearAll: () => void;
    onRemoveFilter: (filter: FileFilter) => void;
    onSearch: (filterValue: string, type: FilterType) => void;
}

/**
 * A form for searching on text values, matching either exactly or by
 * substring ("Contains", persisted as FilterType.FUZZY). Committed values
 * render as removable chips below the input.
 */
export default function SearchBoxForm(props: SearchBoxFormProps) {
    const committedType = props.filters[0]?.type;
    const [filterType, setFilterType] = React.useState<FilterType>(
        committedType === FilterType.FUZZY ? FilterType.FUZZY : FilterType.DEFAULT
    );
    const [searchText, setSearchText] = React.useState("");
    // Bumped to remount (and thereby clear) the search box after each commit
    const [searchBoxKey, setSearchBoxKey] = React.useState(0);

    // Submitting with a different operator replaces this annotation's results
    const willReplaceResults =
        !!searchText.trim() && props.filters.length > 0 && committedType !== filterType;

    function onSearchSubmitted(value: string) {
        props.onSearch(value, filterType);
        setSearchText("");
        setSearchBoxKey((key) => key + 1);
    }

    return (
        <div className={classNames(props.className, styles.container)}>
            <div className={styles.searchRow}>
                <ComboBox
                    className={styles.operatorDropdown}
                    label=""
                    placeholder=""
                    options={OPERATOR_OPTIONS}
                    selectedKey={filterType}
                    onChange={(option) => option && setFilterType(option.key as FilterType)}
                />
                <SearchBox
                    key={searchBoxKey}
                    onChange={setSearchText}
                    onReset={() => setSearchText("")}
                    onSearch={onSearchSubmitted}
                    placeholder="Search..."
                    showSubmitButton
                />
            </div>
            {willReplaceResults && (
                <div className={styles.warning}>
                    <Icon iconName="Warning" />
                    Submitting this value search will replace the current results
                </div>
            )}
            {props.filters.length > 0 && (
                <div className={styles.chips}>
                    <span>
                        {committedType === FilterType.FUZZY ? "Contains:" : "Exact matches:"}
                    </span>
                    {props.filters.map((filter) => (
                        <div className={styles.chip} key={String(filter.value)}>
                            {String(filter.value)}
                            <TransparentIconButton
                                className={styles.chipRemove}
                                iconName="Cancel"
                                label={`Remove ${String(filter.value)}`}
                                title={`Remove ${String(filter.value)}`}
                                onClick={() => props.onRemoveFilter(filter)}
                            />
                        </div>
                    ))}
                    <ActionButton
                        ariaLabel="Clear all"
                        className={styles.clearAll}
                        onClick={props.onClearAll}
                    >
                        Clear all
                    </ActionButton>
                </div>
            )}
        </div>
    );
}
