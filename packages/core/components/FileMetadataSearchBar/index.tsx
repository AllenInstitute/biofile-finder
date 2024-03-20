import {
    DatePicker,
    Dropdown,
    Icon,
    IconButton,
    IDropdownOption,
    SearchBox,
} from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import {
    AnnotationName,
    TOP_LEVEL_FILE_ANNOTATIONS,
    SEARCHABLE_TOP_LEVEL_FILE_ANNOTATIONS,
} from "../../constants";
import { AnnotationType } from "../../entity/AnnotationFormatter";
import FileFilter from "../../entity/FileFilter";
import Tutorial from "../../entity/Tutorial";
import { selection } from "../../state";
import { getFileAttributeFilter } from "../../state/selection/selectors";

import styles from "./FileMetadataSearchBar.module.css";

const FILE_ATTRIBUTE_OPTIONS = SEARCHABLE_TOP_LEVEL_FILE_ANNOTATIONS.map((a) => ({
    key: a.name,
    text: a.displayName,
}));
const FILE_NAME_OPTION = FILE_ATTRIBUTE_OPTIONS.find(
    (o) => o.key === AnnotationName.FILE_NAME
) as IDropdownOption;
// Color chosen from App.module.css
const PURPLE_ICON_STYLE = { icon: { color: "#827aa3" } };

// Because the datestring comes in as an ISO formatted date like 2021-01-02
// creating a new date from that would result in a date displayed as the
// day before due to the UTC offset, to account for this we can add in the offset
// ahead of time.
export function extractDateFromDateString(dateString?: string): Date | undefined {
    if (!dateString) {
        return undefined;
    }
    const date = new Date(dateString);
    date.setMinutes(date.getTimezoneOffset());
    return date;
}

function extractDatesFromRangeOperatorFilterString(
    filterString: string
): { startDate: Date; endDate: Date } | null {
    // Regex with capture groups for identifying ISO datestrings in the RANGE() filter operator
    // e.g. RANGE(2022-01-01T00:00:00.000Z,2022-01-31T00:00:00.000Z)
    // Captures "2022-01-01T00:00:00.000Z" and "2022-01-31T00:00:00.000Z"
    const RANGE_OPERATOR_REGEX = /RANGE\(([\d\-:TZ.]+),([\d\-:TZ.]+)\)/g;
    const exec = RANGE_OPERATOR_REGEX.exec(filterString);
    if (exec && exec.length === 3) {
        // Length of 3 because we use two capture groups
        const startDate = new Date(exec[1]);
        // The RANGE() filter uses an exclusive upper bound.
        // However, we want to present dates in the UI as if the upper bound was inclusive.
        // To handle that, we'll subtract a day from the upper bound used by the filter, then present the result
        const endDate = new Date(exec[2]);
        endDate.setDate(endDate.getDate() - 1);

        return { startDate, endDate };
    }
    return null;
}

/**
 * This component renders a dynamic search bar for querying file records by
 * basic file attributes that are otherwise not queryable through usual means like
 * in the <AnnotationSidebar /> for example.
 */
export default function FileMetadataSearchBar() {
    const dispatch = useDispatch();
    const fileAttributeFilter = useSelector(getFileAttributeFilter);
    const [lastSelectedAttribute, setLastSelectedAttribute] = React.useState<IDropdownOption>(
        FILE_NAME_OPTION
    );
    const selectedAttribute =
        FILE_ATTRIBUTE_OPTIONS.find((a) => a.key === fileAttributeFilter?.name) ||
        lastSelectedAttribute;

    function onResetSearch() {
        if (fileAttributeFilter) {
            dispatch(selection.actions.removeFileFilter(fileAttributeFilter));
        }
    }

    function onSearch(filterValue: string) {
        if (filterValue && filterValue.trim()) {
            const fileFilter = new FileFilter(selectedAttribute.key as string, filterValue);
            if (fileAttributeFilter) {
                dispatch(selection.actions.removeFileFilter(fileAttributeFilter));
            }
            dispatch(selection.actions.addFileFilter(fileFilter));
        }
    }

    function onDateRangeSelection(startDate: Date | null, endDate: Date | null) {
        // Derive previous startDate/endDate from current filter state, if possible
        let oldStartDate;
        let oldEndDate;
        const splitFileAttributeFilter = extractDatesFromRangeOperatorFilterString(
            fileAttributeFilter?.value
        );
        if (splitFileAttributeFilter !== null) {
            oldStartDate = splitFileAttributeFilter.startDate;
            oldEndDate = splitFileAttributeFilter.endDate;
        }

        const newStartDate = startDate || oldStartDate || endDate;
        const newEndDate = endDate || oldEndDate || startDate;
        if (newStartDate && newEndDate) {
            // Add 1 day to endDate to account for RANGE() filter upper bound exclusivity
            const newEndDatePlusOne = new Date(newEndDate);
            newEndDatePlusOne.setDate(newEndDatePlusOne.getDate() + 1);
            onSearch(`RANGE(${newStartDate.toISOString()},${newEndDatePlusOne.toISOString()})`);
        }
    }

    function onAttributeSelection(_: React.FormEvent, option?: IDropdownOption) {
        onResetSearch();
        if (option) {
            setLastSelectedAttribute(option);
        }
    }

    let searchBox: React.ReactNode;
    const annotation = TOP_LEVEL_FILE_ANNOTATIONS.find((a) => a.name === selectedAttribute.key);
    if (annotation?.type === AnnotationType.DATETIME) {
        let startDate;
        let endDate;
        const splitDates = extractDatesFromRangeOperatorFilterString(fileAttributeFilter?.value);
        if (splitDates !== null) {
            startDate = splitDates.startDate;
            endDate = splitDates.endDate;
        }

        searchBox = (
            <span className={styles.dateRangeBox}>
                <DatePicker
                    borderless
                    className={styles.filterInput}
                    ariaLabel="Select a start date"
                    placeholder={`Start of date range`}
                    onSelectDate={(v) => (v ? onDateRangeSelection(v, null) : onResetSearch())}
                    styles={PURPLE_ICON_STYLE}
                    value={extractDateFromDateString(startDate?.toISOString())}
                />
                <div className={styles.dateRangeSeparator}>
                    <Icon iconName="Forward" />
                </div>
                <DatePicker
                    borderless
                    className={styles.filterInput}
                    ariaLabel="Select an end date"
                    placeholder={`End of date range`}
                    onSelectDate={(v) => (v ? onDateRangeSelection(null, v) : onResetSearch())}
                    styles={PURPLE_ICON_STYLE}
                    value={extractDateFromDateString(endDate?.toISOString())}
                />
                <IconButton
                    ariaLabel="Clear filter date"
                    iconProps={{ iconName: "Cancel" }}
                    onClick={onResetSearch}
                    styles={PURPLE_ICON_STYLE}
                    title="Clear"
                />
            </span>
        );
    } else {
        searchBox = (
            <SearchBox
                onClear={onResetSearch}
                className={styles.filterInput}
                placeholder={`Search by ${selectedAttribute.text}`}
                styles={PURPLE_ICON_STYLE}
                onSearch={onSearch}
                value={fileAttributeFilter?.value}
            />
        );
    }

    return (
        <div className={styles.searchBarContainer} id={Tutorial.FILE_ATTRIBUTE_FILTER_ID}>
            <Dropdown
                className={styles.fileAttributeSelector}
                options={FILE_ATTRIBUTE_OPTIONS}
                selectedKey={selectedAttribute.key}
                onChange={onAttributeSelection}
                styles={{ title: { border: "none", borderRight: "1px solid black" } }}
            />
            {searchBox}
        </div>
    );
}
