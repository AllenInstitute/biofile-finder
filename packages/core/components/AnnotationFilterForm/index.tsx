import { IChoiceGroupOption } from "@fluentui/react";
import classNames from "classnames";
import { isNil } from "lodash";
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
    const fuzzyFilters = useSelector(selection.selectors.getFuzzyFilters);
    const canFuzzySearch = useSelector(selection.selectors.isQueryingAicsFms);
    const annotationService = useSelector(interaction.selectors.getAnnotationService);
    const [annotationValues, isLoading, errorMessage] = useAnnotationValues(
        props.annotation.name,
        annotationService
    );

    const fuzzySearchEnabled = React.useMemo(
        () => !!fuzzyFilters?.some((filter) => filter.name === props.annotation.name),
        [fuzzyFilters, props.annotation]
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
        const appliedFilters = new Set(filtersForAnnotation.map((filter) => filter.value));

        return (annotationValues || []).map((value) => ({
            selected: appliedFilters.has(value),
            displayValue: props.annotation.getDisplayValue(value) || value,
            value,
        }));
    }, [props.annotation, annotationValues, filtersForAnnotation]);

    const onDeselectAll = () => {
        // remove all regular filters for this annotation
        dispatch(selection.actions.removeFileFilter(filtersForAnnotation));
    };

    const onDeselect = (item: ListItem) => {
        dispatch(selection.actions.removeFileFilter(createFileFilter(item)));
    };

    const onSelect = (item: ListItem) => {
        dispatch(selection.actions.changeFileFilterType(props.annotation.name, FilterType.DEFAULT));
        dispatch(selection.actions.addFileFilter(createFileFilter(item)));
    };

    // TODO: Should this select ALL or just the visible items in list?
    const onSelectAll = () => {
        dispatch(selection.actions.changeFileFilterType(props.annotation.name, FilterType.DEFAULT));
        dispatch(selection.actions.addFileFilter(items.map((item) => createFileFilter(item))));
    };

    const createFileFilter = (item: ListItem) => {
        return new FileFilter(
            props.annotation.name,
            isNil(props.annotation.valueOf(item.value))
                ? item.value
                : props.annotation.valueOf(item.value),
            filterType
        );
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
                    new FileFilter(props.annotation.name, filterValue, type),
                ])
            );
        }
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
                        type={props.annotation.type}
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
                            fuzzySearchEnabled={fuzzySearchEnabled}
                            fieldName={props.annotation.displayName}
                            defaultValue={filtersForAnnotation?.[0]}
                            hideFuzzyToggle={!canFuzzySearch}
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
