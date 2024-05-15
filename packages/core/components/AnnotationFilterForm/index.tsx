import { Spinner, SpinnerSize } from "@fluentui/react";
import { isNil } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import useAnnotationValues from "./useAnnotationValues";
import Annotation, { AnnotationName } from "../../entity/Annotation";
import { AnnotationType } from "../../entity/AnnotationFormatter";
import FileFilter from "../../entity/FileFilter";
import FileFuzzyFilter from "../../entity/FileFuzzyFilter";
import ListPicker from "../ListPicker";
import { ListItem } from "../ListPicker/ListRow";
import NumberRangePicker from "../NumberRangePicker";
import SearchBoxForm from "../SearchBoxForm";
import DateRangePicker from "../DateRangePicker";
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
    const fuzzyFilters = useSelector(selection.selectors.getFileFuzzyFilters);
    const annotationService = useSelector(interaction.selectors.getAnnotationService);
    const [annotationValues, isLoading, errorMessage] = useAnnotationValues(
        props.annotation.name,
        annotationService
    );

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

    const fuzzySearchEnabled = React.useMemo(() => {
        return (
            fuzzyFilters?.some((filter) => filter.annotationName === props.annotation.name) || false
        );
    }, [fuzzyFilters, props.annotation]);

    const onEnableFuzzySearch = () => {
        const fuzzyFilter = new FileFuzzyFilter(props.annotation.name);
        dispatch(selection.actions.addFileFuzzyFilter(fuzzyFilter));
    };

    const onDisableFuzzySearch = () => {
        const fuzzyFilter = new FileFuzzyFilter(props.annotation.name);
        dispatch(selection.actions.removeFileFuzzyFilter(fuzzyFilter));
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
        dispatch(selection.actions.addFileFilter(fileFilter));
    };

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
        dispatch(selection.actions.addFileFilter(filters));
    };

    function onSearch(filterValue: string) {
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

    // Use the checkboxes if values exist and are few enough to reasonably scroll through
    if (items.length > 0 && items.length <= 100) {
        return (
            <ListPicker
                items={items}
                loading={isLoading}
                title={`Filter by ${props.annotation.displayName}`}
                errorMessage={errorMessage}
                onDeselect={onDeselect}
                onDeselectAll={onDeselectAll}
                onSelect={onSelect}
                onSelectAll={onSelectAll}
            />
        );
    }

    switch (props.annotation.type) {
        case AnnotationType.DATE:
        case AnnotationType.DATETIME:
            return (
                <DateRangePicker
                    className={styles.picker}
                    onSearch={onSearch}
                    title={`Filter by ${props.annotation.displayName}`}
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
                        title={`Filter by ${props.annotation.displayName}`}
                        errorMessage={errorMessage}
                        onSearch={onSearch}
                        onReset={onDeselectAll}
                        currentRange={filtersForAnnotation?.[0]}
                        units={props.annotation.units}
                    />
                );
            }
        case AnnotationType.STRING:
            return (
                <SearchBoxForm
                    className={styles.picker}
                    onDisableFuzzySearch={onDisableFuzzySearch}
                    onEnableFuzzySearch={onEnableFuzzySearch}
                    onSearch={onSearch}
                    onReset={onDeselectAll}
                    fieldName={props.annotation.displayName}
                    fuzzySearchEnabled={fuzzySearchEnabled}
                    title={`Filter by ${props.annotation.displayName}`}
                    currentValue={filtersForAnnotation?.[0]}
                />
            );
        case AnnotationType.DURATION:
        // prettier-ignore
        default: // FALL-THROUGH
            return (
                <ListPicker
                    items={items}
                    loading={isLoading}
                    title={`Filter by ${props.annotation.displayName}`}
                    errorMessage={errorMessage}
                    onDeselect={onDeselect}
                    onDeselectAll={onDeselectAll}
                    onSelect={onSelect}
                    onSelectAll={onSelectAll}
                />
            );
    }
}
