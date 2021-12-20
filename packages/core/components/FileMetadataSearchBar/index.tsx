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

import styles from "./FileMetadataSearchBar.module.css";

const FILE_ATTRIBUTE_OPTIONS = TOP_LEVEL_FILE_ANNOTATIONS.filter(
    (a) => a.name !== AnnotationName.FILE_SIZE
).map((a) => ({
    key: a.name,
    text: a.displayName,
}));
const FILE_NAME_OPTION = FILE_ATTRIBUTE_OPTIONS.find(
    (o) => o.key === AnnotationName.FILE_NAME
) as IDropdownOption;
// Color chosen from App.module.css
const PURPLE_ICON_STYLE = { icon: { color: "#827aa3" } };
export const DATE_RANGE_SEPARATOR = "-to-"; // Not arbitrary, defined per contract with FES

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
        if (option) {
            setLastSelectedAttribute(option);
        }
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
                    styles={PURPLE_ICON_STYLE}
                    value={extractDateFromDateString(startDate)}
                />
                <div className={styles.dateRangeSeparator}>
                    <Icon iconName="Forward" />
                </div>
                <DatePicker
                    borderless
                    className={styles.filterInput}
                    ariaLabel="Select an end date"
                    placeholder={`End of date range`}
                    onSelectDate={(v) =>
                        v ? onDateRangeSelection({ endDate: v }) : onResetSearch()
                    }
                    styles={PURPLE_ICON_STYLE}
                    value={extractDateFromDateString(endDate)}
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
        <div className={styles.searchBarContainer}>
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
