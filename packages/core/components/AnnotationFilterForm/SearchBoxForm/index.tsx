import { ActionButton, Icon } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import { TransparentIconButton } from "../../Buttons";
import ComboBox from "../../ComboBox";
import SearchBox from "../../SearchBox";
import Tooltip from "../../Tooltip";
import FileFilter, { FilterType } from "../../../entity/FileFilter";

import styles from "./SearchBoxForm.module.css";

const FUZZY_OPTION = {
    key: "fuzzy",
    text: "Contains",
    data: {
        tooltip: (
            <>
                Find all values that <strong>include</strong> your input
            </>
        ),
    },
};
const EXACT_OPTION = {
    key: "exact",
    text: "Exactly matches",
    data: {
        tooltip: (
            <>
                Finds only values <strong>identical</strong> to your input
            </>
        ),
    },
};

const OPERATOR_OPTIONS = [EXACT_OPTION, FUZZY_OPTION];

interface SearchBoxFormProps {
    availableValues?: string[];
    className?: string;
    filters: FileFilter[];
    onClearAll: () => void;
    onRemoveFilter: (filter: FileFilter) => void;
    onSearch: (filterValue: string, isFuzzy: boolean) => void;
}

/**
 * A form for searching on text values, matching either exactly or by
 * substring. Committed values render as removable chips below the input.
 */
export default function SearchBoxForm(props: SearchBoxFormProps) {
    const committedType = props.filters[0]?.type;
    const [searchText, setSearchText] = React.useState("");
    const [hasBlurred, setHasBlurred] = React.useState(false);
    const [isFuzzy, setIsFuzzy] = React.useState(
        committedType === undefined || committedType === FilterType.FUZZY
    );
    const selectedOperator = isFuzzy ? FUZZY_OPTION : EXACT_OPTION;
    const committedOperator = committedType === FilterType.FUZZY ? FUZZY_OPTION : EXACT_OPTION;
    const trimmedSearchText = searchText.trim();
    const willReplaceResults =
        !!trimmedSearchText &&
        committedType !== undefined &&
        isFuzzy !== (committedType === FilterType.FUZZY);
    const valueNotFound =
        !!trimmedSearchText &&
        !!props.availableValues?.length &&
        (!isFuzzy
            ? !props.availableValues.includes(trimmedSearchText)
            : !props.availableValues.some((value) =>
                  value.toLowerCase().includes(trimmedSearchText.toLowerCase())
              ));

    function onSearchSubmitted(value: string) {
        if (valueNotFound) {
            setHasBlurred(true);
            return;
        }
        props.onSearch(value, isFuzzy);
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
                        selectedKey={selectedOperator?.key}
                        onChange={(option) => option && setIsFuzzy(option.key === FUZZY_OPTION.key)}
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
                    {isFuzzy
                        ? "No files found containing this value"
                        : "No files found with exactly matching value"}
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
