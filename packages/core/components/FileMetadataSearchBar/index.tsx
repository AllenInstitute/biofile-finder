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

import { AnnotationName, TOP_LEVEL_FILE_ANNOTATIONS } from "../../constants";
import { AnnotationType } from "../../entity/AnnotationFormatter";
import FileFilter from "../../entity/FileFilter";
import { selection } from "../../state";
import { getFileAttributeFilter } from "../../state/selection/selectors";

const styles = require("./FileMetadataSearchBar.module.css");

const FILE_ATTRIBUTE_OPTIONS = TOP_LEVEL_FILE_ANNOTATIONS.filter(
    (a) => a.name !== AnnotationName.FILE_SIZE
).map((a) => ({
    key: a.name,
    text: a.displayName,
}));
const FILE_NAME_OPTION = FILE_ATTRIBUTE_OPTIONS.find(
    (o) => o.key === AnnotationName.FILE_NAME
) as IDropdownOption;
export const DATE_RANGE_SEPARATOR = "-to-"; // Not arbitrary, defined per contract with FES

// Because the datestring comes in as an ISO formatted date like 01-02-21
// creating a new date from that would result in a date displayed as the
// day before due to the UTC offset, to account for this we can add in the offset
// ahead of time.
function extractDateFromDateString(dateString?: string): Date | undefined {
    if (!dateString) {
        return undefined;
    }
    const date = new Date(dateString);
    date.setMinutes(date.getTimezoneOffset());
    return date;
}

/**
 * This component renders a dynamic search bar for querying file records by
 * basic file attributes that are otherwise not queryable through usual means like
 * in the <AnnotationSidebar /> for example.
 */
export default function FileMetadataSearchBar() {
    const dispatch = useDispatch();
    const fileAttributeFilter = useSelector(getFileAttributeFilter);
    const [selectedAttribute, setSelectedAttribute] = React.useState<IDropdownOption>(
        FILE_NAME_OPTION
    );

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

    function onDateRangeSelection(newDateRange: { startDate?: Date; endDate?: Date }) {
        const [oldStartDate = undefined, oldEndDate = undefined] =
            fileAttributeFilter?.value.split(DATE_RANGE_SEPARATOR) || [];
        const startDate = newDateRange.startDate
            ? newDateRange.startDate.toISOString().split("T")[0]
            : oldStartDate;
        const endDate = newDateRange.endDate
            ? newDateRange.endDate.toISOString().split("T")[0]
            : oldEndDate;
        onSearch(`${startDate || endDate}${DATE_RANGE_SEPARATOR}${endDate || startDate}`);
    }

    function onAttributeSelection(_: React.FormEvent, option?: IDropdownOption) {
        onResetSearch();
        option && setSelectedAttribute(option);
    }

    let searchBox: React.ReactNode;
    const annotation = TOP_LEVEL_FILE_ANNOTATIONS.find((a) => a.name === selectedAttribute.key);
    if (annotation?.type === AnnotationType.DATETIME) {
        const [startDate = undefined, endDate = undefined] =
            fileAttributeFilter?.value.split(DATE_RANGE_SEPARATOR) || [];

        searchBox = (
            <span className={styles.dateRangeBox}>
                <DatePicker
                    borderless
                    className={styles.filterInput}
                    ariaLabel="Select a start date"
                    placeholder={`Start of date range`}
                    onSelectDate={(v) =>
                        v ? onDateRangeSelection({ startDate: v }) : onResetSearch()
                    }
                    value={extractDateFromDateString(startDate)}
                />
                <div className={styles.dateRangeSeparator}>
                    <Icon iconName="Forward" />
                </div>
                <DatePicker
                    borderless
                    className={styles.filterInput}
                    ariaLabel="Select a end date"
                    placeholder={`End of date range`}
                    onSelectDate={(v) =>
                        v ? onDateRangeSelection({ endDate: v }) : onResetSearch()
                    }
                    value={extractDateFromDateString(endDate)}
                />
                <IconButton
                    className={styles.cancelButton}
                    ariaLabel="Clear filter date"
                    iconProps={{ iconName: "Cancel" }}
                    onClick={onResetSearch}
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
                onSearch={onSearch}
            />
        );
    }

    return (
        <div className={styles.searchBarContainer}>
            <Dropdown
                className={styles.fileAttributeSelector}
                options={FILE_ATTRIBUTE_OPTIONS}
                selectedKey={selectedAttribute.key}
                onChange={onAttributeSelection}
            />
            {searchBox}
        </div>
    );
}
