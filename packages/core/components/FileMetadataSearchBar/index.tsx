import { Button, DatePicker, Dropdown, IconButton, IDropdownOption, SearchBox } from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { AnnotationName, TOP_LEVEL_FILE_ANNOTATIONS } from "../../constants";
import { AnnotationType } from "../../entity/AnnotationFormatter";
import FileFilter from "../../entity/FileFilter";
import { selection } from "../../state";
import { getFileFilters } from "../../state/selection/selectors";

const styles = require("./FileMetadataSearchBar.module.css");

const FILE_ATTRIBUTE_OPTIONS = TOP_LEVEL_FILE_ANNOTATIONS.map(a => ({
    key: a.name,
    text: a.displayName,
}));
const FILE_NAME_OPTION = FILE_ATTRIBUTE_OPTIONS.find(o => o.key === AnnotationName.FILE_NAME) as IDropdownOption;
const FILE_SIZE_UNITS = ["B", "KB", "MB", "GB", "TB"];
const FILE_SIZE_UNIT_OPTIONS = FILE_SIZE_UNITS.map(unit => ({
    key: unit,
    text: unit
}));

interface FileSizeQuery {
    fileSize?: number;
    unit: string;
}

// Convert human-readable filesize with bytes unit to simply bytes
function fileSizeWithUnitToBytes(fileSize: number = 0, unit: string): number {
    const x = fileSize * Math.pow(1024, FILE_SIZE_UNITS.findIndex(u => u === unit));
    console.log(fileSize, unit, x);
    return x;
}

/**
 * This component renders a dynamic search bar for querying file records by
 * basic file attributes that are otherwise not queryable through usual means like
 * in the <AnnotationSidebar /> for example.
 */
export default function FileMetadataSearchBar() {
    const dispatch = useDispatch();
    const fileFilters = useSelector(getFileFilters);
    const [selectedAttribute, setSelectedAttribute] = React.useState<IDropdownOption>(FILE_NAME_OPTION);
    const [fileSizeQuery, setFileSizeQuery] = React.useState<FileSizeQuery>({ unit: "GB" });

    function onResetSearch() {
        const fileFilter = fileFilters.find(f => f.name === selectedAttribute.key);
        if (fileFilter) {
            dispatch(selection.actions.removeFileFilter(fileFilter));
        }
    }

    function onSearch(filterValue: string) {
        if (filterValue) {
            const fileFilter = new FileFilter(selectedAttribute.key as string, filterValue);
            console.log(selectedAttribute.key, filterValue);
            dispatch(selection.actions.addFileFilter(fileFilter));
        }
    }

    function onFileSizeSearch(fileSizeQueryPatch: Partial<FileSizeQuery>) {
        const newFileSizeQuery = { ...fileSizeQuery, ...fileSizeQueryPatch };
        setFileSizeQuery(newFileSizeQuery);
        const fileSize = fileSizeWithUnitToBytes(newFileSizeQuery.fileSize, newFileSizeQuery.unit);
        if (fileSize) {
            onSearch(`${fileSize}`);
        }
    }

    function onAttributeSelection(_: React.FormEvent, option?: IDropdownOption) {
        onResetSearch();
        setFileSizeQuery({ unit: fileSizeQuery.unit });
        option && setSelectedAttribute(option)
    }

    let searchBox: React.ReactNode;
    const annotation = TOP_LEVEL_FILE_ANNOTATIONS.find(a => a.name === selectedAttribute.key);
    if (selectedAttribute.key === AnnotationName.FILE_SIZE) {
        // File size is displayed to users in human readable format, thus we must accept
        // human readable format as the input here.
        searchBox = (
            <span className={styles.searchBoxSelector}>
                <SearchBox
                    onClear={onResetSearch}
                    className={styles.searchBox}
                    placeholder={`Search by ${selectedAttribute.text}`}
                    onSearch={(fileSize) => onFileSizeSearch({ fileSize })}
                />
                <Dropdown
                    options={FILE_SIZE_UNIT_OPTIONS}
                    onChange={(_, o) => onFileSizeSearch({ unit: o?.key as string })}
                    selectedKey={fileSizeQuery.unit}
                />
            </span>
        );
    } else if (annotation?.type === AnnotationType.DATETIME) {
        searchBox = (
            <span className={styles.searchBoxSelector}>
                <DatePicker
                    className={styles.searchBox}
                    ariaLabel="Select a date"
                    placeholder={`Search by ${selectedAttribute.text}`}
                    onSelectDate={(v) => v ? onSearch(v.toString()) : onResetSearch()}
                />
                <DatePicker
                    className={styles.searchBox}
                    ariaLabel="Select a date"
                    placeholder={`Search by ${selectedAttribute.text}`}
                    onSelectDate={(v) => v ? onSearch(v.toString()) : onResetSearch()}
                />
                <IconButton
                    className={styles.searchBoxButton}
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
                className={styles.searchBox}
                placeholder={`Search by ${selectedAttribute.text}`}
                onSearch={onSearch}
            />
        )
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
    )
}
