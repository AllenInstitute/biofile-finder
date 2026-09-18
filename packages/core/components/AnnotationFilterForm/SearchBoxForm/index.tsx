import { ActionButton, Icon } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import { TransparentIconButton } from "../../Buttons";
import ComboBox from "../../ComboBox";
import SearchBox from "../../SearchBox";
import Tooltip from "../../Tooltip";
import FileFilter, { FilterType } from "../../../entity/FileFilter";

import styles from "./SearchBoxForm.module.css";

const OPERATOR_OPTIONS = [
    {
        key: FilterType.DEFAULT,
        text: "Exactly matches",
        data: { tooltip: "Finds only values identical to your input" },
    },
    {
        key: FilterType.FUZZY,
        text: "Contains",
        data: { tooltip: "Finds values that include your input" },
    },
];

interface SearchBoxFormProps {
    availableValues?: string[];
    className?: string;
    filters: FileFilter[];
    onClearAll: () => void;
    onRemoveFilter: (filter: FileFilter) => void;
    onSearch: (filterValue: string, type: FilterType) => void;
}

/**
 * A form for searching on text values, matching either exactly or by
 * substring. Committed values render as removable chips below the input.
 */
export default function SearchBoxForm(props: SearchBoxFormProps) {
    const committedType = props.filters[0]?.type;
    const [filterType, setFilterType] = React.useState<FilterType>(
        committedType === FilterType.DEFAULT ? FilterType.DEFAULT : FilterType.FUZZY
    );
    const [searchText, setSearchText] = React.useState("");
    const [hasBlurred, setHasBlurred] = React.useState(false);
    const selectedOperator = OPERATOR_OPTIONS.find((option) => option.key === filterType);
    const committedOperator =
        OPERATOR_OPTIONS.find((option) => option.key === committedType) ?? OPERATOR_OPTIONS[0];
    const willReplaceResults =
        !!searchText.trim() && props.filters.some((filter) => filter.type !== filterType);
    const valueNotFound =
        filterType === FilterType.DEFAULT &&
        !!searchText.trim() &&
        !!props.availableValues?.length &&
        !props.availableValues.includes(searchText.trim());

    function onSearchSubmitted(value: string) {
        props.onSearch(value, filterType);
        setSearchText("");
        setHasBlurred(false);
    }

    return (
        <div className={classNames(props.className, styles.container)}>
            <div className={styles.searchRow}>
                <Tooltip
                    content={selectedOperator?.data.tooltip}
                    hostClassName={styles.operatorDropdown}
                >
                    <ComboBox
                        label=""
                        placeholder=""
                        options={OPERATOR_OPTIONS}
                        rootClassName={styles.operatorDropdownControl}
                        selectedKey={filterType}
                        onChange={(option) => option && setFilterType(option.key as FilterType)}
                    />
                </Tooltip>
                <SearchBox
                    className={styles.searchInput}
                    onBlur={() => setHasBlurred(true)}
                    onChange={(value) => {
                        setSearchText(value);
                        setHasBlurred(false);
                    }}
                    onReset={() => {
                        setSearchText("");
                        setHasBlurred(false);
                    }}
                    onSearch={onSearchSubmitted}
                    placeholder="Search values..."
                    showSubmitButton
                    value={searchText}
                />
            </div>
            {hasBlurred && valueNotFound ? (
                <div className={styles.error}>
                    <Icon iconName="Warning" />
                    No files found with exactly matching value
                </div>
            ) : (
                willReplaceResults && (
                    <div className={styles.warning}>
                        <Icon iconName="Warning" />
                        Submitting this value search will replace the current results
                    </div>
                )
            )}
            {props.filters.length > 0 && (
                <div className={styles.chips}>
                    <span>{committedOperator.text}:</span>
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
