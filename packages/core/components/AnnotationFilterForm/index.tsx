import { IChoiceGroupOption } from "@fluentui/react";
import classNames from "classnames";
import { castArray, isNil } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import useAnnotationValues from "./useAnnotationValues";
import SearchBoxForm from "./SearchBoxForm";
import ChoiceGroup from "../ChoiceGroup";
import DateRangePicker from "../DateRangePicker";
import LoadingIcon from "../Icons/LoadingIcon";
import ListPicker from "../ListPicker";
import { ListItem } from "../ListPicker/ListRow";
import NumberRangePicker from "../NumberRangePicker";
import Annotation from "../../entity/Annotation";
import AnnotationName from "../../entity/Annotation/AnnotationName";
import { AnnotationType } from "../../entity/AnnotationFormatter";
import FileFilter, { FilterType } from "../../entity/FileFilter";
import { interaction, selection } from "../../state";
import { TOP_LEVEL_FILE_ANNOTATION_NAMES } from "../../constants";

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
    const [annotationValues, isLoading, errorMessage] = useAnnotationValues(
        props.annotation.name,
        annotationService
    );

    const filtersForAnnotation = React.useMemo(
        () => allFilters.filter((filter) => filter.name === props.annotation.name),
        [allFilters, props.annotation]
    );

    // Assume all filters use same type
    const defaultFilterType = React.useMemo(
        () => filtersForAnnotation?.[0]?.type ?? FilterType.DEFAULT,
        [filtersForAnnotation]
    );

    const [filterType, setFilterType] = React.useState<FilterType>(defaultFilterType);

    // Propagate regular file filter values from state into UI
    const items = React.useMemo<ListItem[]>(() => {
        const appliedFilters = new Set(filtersForAnnotation.map((filter) => String(filter.value)));

        return (annotationValues || []).map((value) => ({
            selected: appliedFilters.has(String(value)),
            displayValue: props.annotation.getDisplayValue(value) || value,
            value,
        }));
    }, [props.annotation, annotationValues, filtersForAnnotation]);

    // Top-level file attributes (file name, size, uploaded, etc.) never have their values
    // fetched (see useAnnotationValues), so there is nothing for a "Browse list" tab to show.
    const canBrowseList = !TOP_LEVEL_FILE_ANNOTATION_NAMES.includes(props.annotation.name);

    // FILE_SIZE is excluded: range filtering is not yet supported for it in the backend.
    const typeHasDedicatedPicker =
        props.annotation.name !== AnnotationName.FILE_SIZE &&
        [AnnotationType.NUMBER, AnnotationType.DATE, AnnotationType.DATETIME].includes(
            props.annotation.type
        );

    // Types with a dedicated picker (text search, number/date range) also offer a
    // "Browse list" tab. Short string value lists open on the list; range pickers
    // always open on the range inputs. The default depends on asynchronously loaded
    // values, so it stays separate from the user's explicit choice.
    const defaultTab =
        props.annotation.type === AnnotationType.STRING && items.length > 0 && items.length <= 100
            ? "browse"
            : "picker";
    const [selectedTab, setSelectedTab] = React.useState<"picker" | "browse">();
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

        return new FileFilter(
            props.annotation.name,
            value,
            FilterType.DEFAULT,
            props.annotation.type
        );
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
        // Verify that filter type is changing to avoid dispatching unnecessary clean-up actions
        if (!!option?.key && option?.key !== filterType) {
            setFilterType(option.key as FilterType);
            // Selecting ANY or NONE should automatically re-trigger search and re-render dom,
            // but selecting SOME shouldn't trigger anything until a value is selected
            // or a search term is entered
            switch (option.key) {
                case FilterType.DEFAULT:
                    return; // No further action needed, dispatch on search instead
                case FilterType.EXCLUDE:
                case FilterType.ANY:
                default:
                    dispatch(
                        selection.actions.changeFileFilterType(
                            props.annotation.name,
                            option.key as FilterType
                        )
                    );
            }
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

    function onCommitSearchValue(filterValue: string, type: FilterType) {
        if (!filterValue || !filterValue.trim()) {
            return;
        }
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

        const isPickerActive = activeTab === "picker";
        const tabs: { key: "picker" | "browse"; label: string }[] = [
            { key: "picker", label: pickerLabel },
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
                    <div className={classNames({ [styles.hidden]: !isPickerActive })}>{picker}</div>
                    {!isPickerActive && listPickerComponent}
                </div>
            </div>
        );
    };

    const searchFormType = () => {
        // The FMS file size attribute has no fetched values to list and the backend rejects
        // RANGE(...) filters on it, so there is no working value picker to offer.
        if (props.annotation.name === AnnotationName.FILE_SIZE) {
            return (
                <div className={styles.footer}>
                    Filtering by specific {props.annotation.displayName} values is not yet supported
                    for this data source
                </div>
            );
        }

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
            case AnnotationType.NUMBER:
                return renderTabbedPicker(
                    "Range",
                    <NumberRangePicker
                        className={styles.rangePicker}
                        title={props.annotation.displayName}
                        items={items}
                        loading={isLoading}
                        errorMessage={errorMessage}
                        onSearch={onSearch}
                        currentRange={filtersForAnnotation?.[0]}
                        units={props.annotation.units}
                    />
                );
            case AnnotationType.STRING:
                return renderTabbedPicker(
                    "Search",
                    <SearchBoxForm
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
                    // Fuzzy is not in choice group
                    defaultSelectedKey={
                        filterType !== FilterType.FUZZY ? filterType : FilterType.DEFAULT
                    }
                    options={[
                        {
                            key: FilterType.DEFAULT,
                            text: `Some value${items.length > 0 ? "(s)" : ""}`,
                        },
                        {
                            key: FilterType.ANY,
                            text: "Any value",
                        },
                        {
                            key: FilterType.EXCLUDE,
                            text: "No value",
                        },
                    ]}
                    onChange={(_, option) => onFilterTypeOptionChange(option)}
                />
            </div>
            {filterType === FilterType.DEFAULT || filterType === FilterType.FUZZY ? (
                searchFormType()
            ) : (
                <div className={styles.footer}>
                    All files with {filterType === FilterType.EXCLUDE ? "no " : "any "}
                    value for {props.annotation.displayName}
                </div>
            )}
        </div>
    );
}
