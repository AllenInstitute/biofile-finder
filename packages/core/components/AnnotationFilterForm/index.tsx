import { IChoiceGroupOption } from "@fluentui/react";
import classNames from "classnames";
import { castArray, isNil } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import SearchBoxForm from "./SearchBoxForm";
import useAnnotationValues from "./useAnnotationValues";
import ChoiceGroup from "../ChoiceGroup";
import DateRangePicker from "../DateRangePicker";
import LoadingIcon from "../Icons/LoadingIcon";
import ListPicker from "../ListPicker";
import { ListItem } from "../ListPicker/ListRow";
import NumberRangePicker from "../NumberRangePicker";
import { TOP_LEVEL_FILE_ANNOTATION_NAMES } from "../../constants";
import Annotation from "../../entity/Annotation";
import AnnotationName from "../../entity/Annotation/AnnotationName";
import { AnnotationType } from "../../entity/AnnotationFormatter";
import FileFilter, { FilterType, MatchStyle } from "../../entity/FileFilter";
import { interaction, selection } from "../../state";

import styles from "./AnnotationFilterForm.module.css";

interface AnnotationFilterFormProps {
    annotation: Annotation;
}

/**
 * A form that provides a user the ability to select particular annotation values with which
 * to filter the application's data. It will render different "value pickers" based on the type
 * of annotation: if the annotation is of type string, it will render a list for the user to choose
 * amongst its items; if the annotation is of type date, it will render a date input; etc.
 */
export default function AnnotationFilterForm(props: AnnotationFilterFormProps) {
    const dispatch = useDispatch();
    const allFilters = useSelector(selection.selectors.getFileFilters);
    const annotationService = useSelector(interaction.selectors.getAnnotationService);
    const canSupportAdvancedFilters = useSelector(
        interaction.selectors.getCanSupportAdvancedFilters
    );
    const [annotationValues, isLoading, errorMessage] = useAnnotationValues(
        props.annotation.name,
        annotationService
    );

    const filtersForAnnotation = React.useMemo(
        () => allFilters.filter((filter) => filter.name === props.annotation.name),
        [allFilters, props.annotation]
    );

    const canOfferAllValues =
        canSupportAdvancedFilters &&
        ![AnnotationType.NUMBER, AnnotationType.DATE, AnnotationType.DATETIME].includes(
            props.annotation.type
        );

    // Assume all filters use same type. "Contains" is a way of searching for some value(s),
    // not a mode of its own, so it never becomes the type new filters are created with
    const defaultFilterType = React.useMemo(() => {
        const type = filtersForAnnotation?.[0]?.type;
        if (!type || type === FilterType.FUZZY) return FilterType.DEFAULT;
        const isAllValues = type === FilterType.ALL || type === FilterType.FUZZY_ALL;
        if (isAllValues) return canOfferAllValues ? FilterType.ALL : FilterType.DEFAULT;
        return type;
    }, [filtersForAnnotation, canOfferAllValues]);

    const [filterType, setFilterType] = React.useState<FilterType>(defaultFilterType);

    // Format display values once per value list. Formatting is O(n) and can be expensive
    // (e.g. Intl date formatting), so keep it out of the memo that reacts to filter changes.
    const formattedValues: Omit<ListItem, "selected">[] = React.useMemo(
        () =>
            (annotationValues || []).map((value) => ({
                displayValue: props.annotation.getDisplayValue(value) || value,
                value,
            })),
        [props.annotation, annotationValues]
    );

    // Propagate regular file filter values from state into UI
    const items = React.useMemo<ListItem[]>(() => {
        const appliedFilters = new Set(filtersForAnnotation.map((filter) => String(filter.value)));

        return formattedValues.map((item) => ({
            ...item,
            selected: appliedFilters.has(String(item.value)),
        }));
    }, [formattedValues, filtersForAnnotation]);

    // Top-level file attributes (file name, size, uploaded, etc.) never have their values
    // fetched (see useAnnotationValues), so there is nothing for a "Browse list" tab to show.
    const canBrowseList = !TOP_LEVEL_FILE_ANNOTATION_NAMES.includes(props.annotation.name);

    const typeHasDedicatedPicker = [
        AnnotationType.NUMBER,
        AnnotationType.DATE,
        AnnotationType.DATETIME,
    ].includes(props.annotation.type);

    // "Contains" filters are only visible on the search form, not in the browse list
    const hasFuzzyFilter = filtersForAnnotation.some(
        (filter) => filter.matchStyle === MatchStyle.CONTAINS
    );
    // A range filter value is always formatted as "RANGE(...)". If existing filters exist
    // but none are range-formatted, the user previously selected from the browse list.
    const hasRangeFilter = filtersForAnnotation.some((filter) =>
        String(filter.value).startsWith("RANGE(")
    );
    // Types with a dedicated form (text search, number/date range) also offer a
    // "Browse list" tab. Short string value lists open on the list unless a "Contains"
    // filter is applied; range pickers open on the range inputs unless the user previously
    // selected from the list. The default depends on asynchronously loaded values, so it
    // stays separate from the user's explicit choice (selectedTab).
    const shouldDefaultToBrowse =
        (props.annotation.type === AnnotationType.STRING &&
            !hasFuzzyFilter &&
            items.length > 0 &&
            items.length <= 100) ||
        (typeHasDedicatedPicker && filtersForAnnotation.length > 0 && !hasRangeFilter);
    const defaultTab = shouldDefaultToBrowse ? "browse" : "form";
    const [selectedTab, setSelectedTab] = React.useState<"form" | "browse">();
    const activeTab = selectedTab ?? defaultTab;

    const onDeselectAll = () => {
        // remove all regular filters for this annotation
        dispatch(selection.actions.removeFileFilter(filtersForAnnotation));
    };

    const onDeselect = (item: ListItem) => {
        const matchingFilters = filtersForAnnotation.filter(
            (filter) => String(filter.value) === String(item.value)
        );
        if (matchingFilters.length) {
            dispatch(selection.actions.removeFileFilter(matchingFilters));
        }
    };

    const onSelect = (item: ListItem) => {
        commitFilters(createFileFilter(item));
    };

    // TODO: Should this select ALL or just the visible items in list?
    const onSelectAll = () => {
        commitFilters(items.map((item) => createFileFilter(item)));
    };

    const createFileFilter = (item: ListItem) => {
        const formattedValue = props.annotation.formatter.valueOf(item.value);
        const value = isNil(formattedValue) ? item.value : formattedValue;

        return new FileFilter(props.annotation.name, value, filterType, props.annotation.type);
    };

    const commitFilters = (newFilters: FileFilter | FileFilter[]) => {
        const filtersAsArray = castArray(newFilters);
        if (!filtersAsArray.length) {
            return;
        }
        const type = filtersAsArray[0].type;
        if (filtersForAnnotation.some((filter) => filter.type !== type)) {
            dispatch(
                selection.actions.setFileFilters([
                    ...allFilters.filter((filter) => filter.name !== props.annotation.name),
                    ...filtersAsArray,
                ])
            );
        } else {
            dispatch(selection.actions.addFileFilter(newFilters));
        }
    };

    const onFilterTypeOptionChange = (option: IChoiceGroupOption | undefined) => {
        // Only act when the type actually changes, to avoid unnecessary clean-up dispatches
        if (!option?.key || option.key === filterType) return;
        setFilterType(option.key as FilterType);

        // "Any value" and "no value" are complete filters as soon as they're selected. "Some
        // value(s)" and "all values" wait for a value, so there is only something to do if
        // existing values need converting; otherwise the current filter stays (keeping its row
        // and edit menu open) until the first value replaces it.
        const waitsForValue = option.key === FilterType.DEFAULT || option.key === FilterType.ALL;
        if (!waitsForValue || filtersForAnnotation.some((filter) => filter.hasValue)) {
            dispatch(
                selection.actions.changeFileFilterType(
                    props.annotation.name,
                    option.key as FilterType
                )
            );
        }
    };

    function onSearch(filterValue: string, type: FilterType = FilterType.DEFAULT) {
        if (filterValue && filterValue.trim()) {
            dispatch(
                selection.actions.setFileFilters([
                    ...allFilters.filter((filter) => filter.name !== props.annotation.name),
                    new FileFilter(props.annotation.name, filterValue, type, props.annotation.type),
                ])
            );
        }
    }

    function onCommitSearchValue(filterValue: string, isFuzzy: boolean) {
        if (!filterValue || !filterValue.trim()) {
            return;
        }
        const fuzzyType = filterType === FilterType.ALL ? FilterType.FUZZY_ALL : FilterType.FUZZY;
        const type = isFuzzy ? fuzzyType : filterType;
        commitFilters(
            new FileFilter(props.annotation.name, filterValue, type, props.annotation.type)
        );
    }

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <LoadingIcon />
            </div>
        );
    }

    const listPickerComponent = (
        <ListPicker
            // The list caches its rows, so remount to give them the current filter type
            key={filterType}
            className={styles.listPicker}
            items={items}
            loading={isLoading}
            errorMessage={errorMessage}
            onDeselect={onDeselect}
            onDeselectAll={onDeselectAll}
            onSelect={onSelect}
            onSelectAll={onSelectAll}
        />
    );

    const renderTabbedPicker = (pickerLabel: string, picker: React.ReactNode) => {
        if (!canBrowseList) {
            return (
                <div className={classNames(styles.picker, styles.tabbedPicker)}>
                    <div className={styles.modeContainer}>{picker}</div>
                </div>
            );
        }

        const isFormActive = activeTab === "form";
        const tabs: { key: "form" | "browse"; label: string }[] = [
            { key: "form", label: pickerLabel },
            { key: "browse", label: "Browse list" },
        ];
        return (
            <div className={classNames(styles.picker, styles.tabbedPicker)}>
                <div className={styles.modeContainer}>
                    <div className={styles.tabs} role="tablist">
                        {tabs.map((tab) => (
                            <button
                                aria-selected={activeTab === tab.key}
                                className={classNames(styles.tab, {
                                    [styles.tabActive]: activeTab === tab.key,
                                })}
                                key={tab.key}
                                onClick={() => setSelectedTab(tab.key)}
                                role="tab"
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    {/* Kept mounted so draft input survives switching to the list and back */}
                    <div className={classNames({ [styles.hidden]: !isFormActive })}>{picker}</div>
                    {!isFormActive && listPickerComponent}
                </div>
            </div>
        );
    };

    const searchFormType = () => {
        // Types with dedicated pickers (number, date, datetime) use their own UI.
        // Non-string types without dedicated pickers fall back to the list picker when values are available.
        if (
            !typeHasDedicatedPicker &&
            props.annotation.type !== AnnotationType.STRING &&
            items.length > 0
        ) {
            return listPickerComponent;
        }

        switch (props.annotation.type) {
            case AnnotationType.DATE:
            case AnnotationType.DATETIME:
                return renderTabbedPicker(
                    "Range",
                    <DateRangePicker
                        className={styles.rangePicker}
                        onSearch={onSearch}
                        onReset={onDeselectAll}
                        currentRange={filtersForAnnotation?.[0]}
                        type={props.annotation.type}
                    />
                );
            case AnnotationType.NUMBER: {
                // We are unable to pre-fetch values for top level annotations,
                // so must manually set a default min/max value for size
                const isFileSize = props.annotation.name === AnnotationName.FILE_SIZE;
                return renderTabbedPicker(
                    "Range",
                    <NumberRangePicker
                        className={styles.rangePicker}
                        title={props.annotation.displayName}
                        items={items}
                        loading={isLoading}
                        errorMessage={errorMessage}
                        formatter={props.annotation.units ? props.annotation.formatter : undefined}
                        onSearch={onSearch}
                        onReset={onDeselectAll}
                        currentRange={filtersForAnnotation?.[0]}
                        units={props.annotation.units}
                        defaultMin={isFileSize ? "0" : undefined}
                        fallbackMax={isFileSize ? String(Number.MAX_SAFE_INTEGER) : undefined}
                    />
                );
            }
            case AnnotationType.STRING:
                return renderTabbedPicker(
                    "Search",
                    <SearchBoxForm
                        availableValues={items.map((item) => String(item.value))}
                        filters={filtersForAnnotation}
                        onClearAll={onDeselectAll}
                        onRemoveFilter={(filter) =>
                            dispatch(selection.actions.removeFileFilter(filter))
                        }
                        onSearch={onCommitSearchValue}
                    />
                );
            case AnnotationType.DURATION:
            // prettier-ignore
            default: // FALL-THROUGH
                return (listPickerComponent);
        }
    };

    return (
        <div className={styles.form}>
            <div className={classNames(styles.header)}>
                <h3>Filter {props.annotation.displayName} by</h3>
                <ChoiceGroup
                    className={styles.choiceGroup}
                    defaultSelectedKey={filterType}
                    options={[
                        {
                            key: FilterType.DEFAULT,
                            text: `Some value${items.length > 0 ? "(s)" : ""}`,
                        },
                        ...(canOfferAllValues ? [{ key: FilterType.ALL, text: "All values" }] : []),
                        {
                            key: FilterType.ANY_VALUE,
                            text: "Any value",
                        },
                        {
                            key: FilterType.NO_VALUE,
                            text: "No value",
                        },
                    ]}
                    onChange={(_, option) => onFilterTypeOptionChange(option)}
                />
            </div>
            {filterType === FilterType.DEFAULT || filterType === FilterType.ALL ? (
                searchFormType()
            ) : (
                <div className={styles.footer}>
                    All files with {filterType === FilterType.NO_VALUE ? "no " : "any "}
                    value for {props.annotation.displayName}
                </div>
            )}
        </div>
    );
}
