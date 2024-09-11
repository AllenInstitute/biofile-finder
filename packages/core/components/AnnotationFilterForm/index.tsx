import { Spinner, SpinnerSize } from "@fluentui/react";
import classNames from "classnames";
import { isNil } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import useAnnotationValues from "./useAnnotationValues";
import SearchBoxForm from "./SearchBoxForm";
import ChoiceGroup from "../ChoiceGroup";
import DateRangePicker from "../DateRangePicker";
import ListPicker from "../ListPicker";
import { ListItem } from "../ListPicker/ListRow";
import NumberRangePicker from "../NumberRangePicker";
import Annotation from "../../entity/Annotation";
import AnnotationName from "../../entity/Annotation/AnnotationName";
import { AnnotationType } from "../../entity/AnnotationFormatter";
import FileFilter from "../../entity/FileFilter";
import ExcludeFilter from "../../entity/SimpleFilter/ExcludeFilter";
import FuzzyFilter from "../../entity/SimpleFilter/FuzzyFilter";
import IncludeFilter from "../../entity/SimpleFilter/IncludeFilter";
import { interaction, selection } from "../../state";

import styles from "./AnnotationFilterForm.module.css";

interface AnnotationFilterFormProps {
    annotation: Annotation;
}

enum FilterType {
    ANY = "any",
    NONE = "none",
    SOME = "some",
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
    const fuzzyFilters = useSelector(selection.selectors.getFuzzyFilters);
    const anyValueFilters = useSelector(selection.selectors.getIncludeFilters);
    const noValueFilters = useSelector(selection.selectors.getExcludeFilters);
    const annotationService = useSelector(interaction.selectors.getAnnotationService);
    const [annotationValues, isLoading, errorMessage] = useAnnotationValues(
        props.annotation.name,
        annotationService
    );
    const usingAnyValueFilter: boolean = React.useMemo(() => {
        return (
            anyValueFilters?.some((filter) => filter.annotationName === props.annotation.name) ||
            false
        );
    }, [anyValueFilters, props.annotation]);
    const usingNoValueFilter: boolean = React.useMemo(() => {
        return (
            noValueFilters?.some((filter) => filter.annotationName === props.annotation.name) ||
            false
        );
    }, [noValueFilters, props.annotation]);
    const defaultFilterType = () => {
        if (usingAnyValueFilter) return FilterType.ANY;
        if (usingNoValueFilter) return FilterType.NONE;
        return FilterType.SOME;
    };
    const [filterType, setFilterType] = React.useState<FilterType | string>(defaultFilterType);

    const filtersForAnnotation = React.useMemo(
        () => allFilters.filter((filter) => filter.name === props.annotation.name),
        [allFilters, props.annotation]
    );

    const items = React.useMemo<ListItem[]>(() => {
        const appliedFilters = new Set(filtersForAnnotation.map((filter) => filter.value));

        return (annotationValues || []).map((value) => ({
            selected: appliedFilters.has(value),
            displayValue: props.annotation.getDisplayValue(value) || value,
            value,
        }));
    }, [props.annotation, annotationValues, filtersForAnnotation]);

    const fuzzySearchEnabled: boolean = React.useMemo(() => {
        return (
            fuzzyFilters?.some((filter) => filter.annotationName === props.annotation.name) || false
        );
    }, [fuzzyFilters, props.annotation]);

    const onToggleFuzzySearch = () => {
        const fuzzyFilter = new FuzzyFilter(props.annotation.name);
        fuzzySearchEnabled
            ? dispatch(selection.actions.removeFuzzyFilter(fuzzyFilter))
            : dispatch(selection.actions.addFuzzyFilter(fuzzyFilter));
    };

    const onDeselectAll = () => {
        dispatch(selection.actions.removeFileFilter(filtersForAnnotation));
    };

    const onDeselect = (item: ListItem) => {
        const fileFilter = new FileFilter(
            props.annotation.name,
            isNil(props.annotation.valueOf(item.value))
                ? item.value
                : props.annotation.valueOf(item.value)
        );
        dispatch(selection.actions.removeFileFilter(fileFilter));
    };

    const onSelect = (item: ListItem) => {
        const fileFilter = new FileFilter(
            props.annotation.name,
            isNil(props.annotation.valueOf(item.value))
                ? item.value
                : props.annotation.valueOf(item.value)
        );
        removeSpecialFilters();
        dispatch(selection.actions.addFileFilter(fileFilter));
    };

    // TODO: Should this select ALL or just the visible items in list?
    const onSelectAll = () => {
        const filters = items.map(
            (item) =>
                new FileFilter(
                    props.annotation.name,
                    isNil(props.annotation.valueOf(item.value))
                        ? item.value
                        : props.annotation.valueOf(item.value)
                )
        );
        removeSpecialFilters();
        dispatch(selection.actions.addFileFilter(filters));
    };

    // Any value/"include"
    const onSelectAny = () => {
        const includeFilter = new IncludeFilter(props.annotation.name);
        // Skip if already selected
        if (!usingAnyValueFilter) {
            removeSpecialFilters();
            // Currently also incompatible with fuzzy search
            dispatch(selection.actions.removeFuzzyFilter(new FuzzyFilter(props.annotation.name)));
            dispatch(selection.actions.addIncludeFilter(includeFilter));
            // Also remove any other current filters for this annotation
            onDeselectAll();
        }
    };

    // No value/"exclude"
    const onSelectNone = () => {
        const excludeFilter = new ExcludeFilter(props.annotation.name);
        // Skip if already selected
        if (!usingNoValueFilter) {
            removeSpecialFilters();
            // Currently also incompatible with fuzzy search
            dispatch(selection.actions.removeFuzzyFilter(new FuzzyFilter(props.annotation.name)));
            dispatch(selection.actions.addExcludeFilter(excludeFilter));
            // Also remove any other current filters for this annotation
            onDeselectAll();
        }
    };

    // Check if ANY/NONE filter is applied and remove,
    // since incompatible with each other & SOME filter type
    function removeSpecialFilters() {
        if (usingAnyValueFilter) {
            dispatch(
                selection.actions.removeIncludeFilter(new IncludeFilter(props.annotation.name))
            );
        }
        if (usingNoValueFilter) {
            dispatch(
                selection.actions.removeExcludeFilter(new ExcludeFilter(props.annotation.name))
            );
        }
    }

    function onSearch(filterValue: string) {
        removeSpecialFilters();
        if (filterValue && filterValue.trim()) {
            dispatch(
                selection.actions.setFileFilters([
                    ...allFilters.filter((filter) => filter.name !== props.annotation.name),
                    new FileFilter(props.annotation.name, filterValue),
                ])
            );
        }
    }

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <Spinner size={SpinnerSize.small} />
            </div>
        );
    }

    const listPickerComponent = (
        <ListPicker
            items={items}
            loading={isLoading}
            errorMessage={errorMessage}
            onDeselect={onDeselect}
            onDeselectAll={onDeselectAll}
            onSelect={onSelect}
            onSelectAll={onSelectAll}
        />
    );

    const searchFormType = () => {
        // Use the checkboxes if values exist and are few enough to reasonably scroll through
        if (items.length > 0 && items.length <= 100) {
            return listPickerComponent;
        }

        switch (props.annotation.type) {
            case AnnotationType.DATE:
            case AnnotationType.DATETIME:
                return (
                    <DateRangePicker
                        className={styles.picker}
                        onSearch={onSearch}
                        onReset={onDeselectAll}
                        currentRange={filtersForAnnotation?.[0]}
                    />
                );
            case AnnotationType.NUMBER:
                // File size is a special case where we don't have
                // the ability to filter by range in the backend yet
                // so we'll just let that case fall through to the string below
                if (props.annotation.name !== AnnotationName.FILE_SIZE) {
                    return (
                        <NumberRangePicker
                            className={styles.picker}
                            items={items}
                            loading={isLoading}
                            errorMessage={errorMessage}
                            onSearch={onSearch}
                            currentRange={filtersForAnnotation?.[0]}
                            units={props.annotation.units}
                        />
                    );
                }
            case AnnotationType.STRING:
                // Annotations without a scrollable list of values, e.g., File Path
                if (items.length == 0) {
                    return (
                        <SearchBoxForm
                            className={styles.picker}
                            onSelectAll={onSelectAll}
                            onDeselectAll={onDeselectAll}
                            onSearch={onSearch}
                            onToggleFuzzySearch={onToggleFuzzySearch}
                            fuzzySearchEnabled={fuzzySearchEnabled}
                            fieldName={props.annotation.displayName}
                            defaultValue={filtersForAnnotation?.[0]}
                        />
                    );
                }
            case AnnotationType.DURATION:
            // prettier-ignore
            default: // FALL-THROUGH
                return (listPickerComponent);
        }
    };

    return (
        <div>
            <div className={classNames(styles.header)}>
                <h3>Filter {props.annotation.displayName} by</h3>
                <ChoiceGroup
                    className={styles.choiceGroup}
                    defaultSelectedKey={filterType}
                    options={[
                        {
                            key: FilterType.SOME,
                            text: `Some value${items.length > 0 ? "(s)" : ""}`,
                        },
                        {
                            key: FilterType.ANY,
                            text: "Any value",
                        },
                        {
                            key: FilterType.NONE,
                            text: "No value (blank)",
                        },
                    ]}
                    onChange={(_, option) => {
                        setFilterType(option?.key || filterType);
                        if (option?.key === FilterType.ANY) onSelectAny();
                        if (option?.key === FilterType.NONE) onSelectNone();
                    }}
                />
            </div>
            {filterType === FilterType.SOME ? (
                searchFormType()
            ) : (
                <div className={styles.footer}>
                    All files with {filterType === FilterType.NONE ? "no " : "any "}
                    value for {props.annotation.displayName}
                </div>
            )}
        </div>
    );
}
