import { Spinner, SpinnerSize } from "@fluentui/react";
import classNames from "classnames";
import { isNil } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import useAnnotationValues from "./useAnnotationValues";
import SearchBoxForm from "./SearchBoxForm";
import DateRangePicker from "../DateRangePicker";
import ListPicker from "../ListPicker";
import { ListItem } from "../ListPicker/ListRow";
import NumberRangePicker from "../NumberRangePicker";
import Annotation from "../../entity/Annotation";
import AnnotationName from "../../entity/Annotation/AnnotationName";
import { AnnotationType } from "../../entity/AnnotationFormatter";
import FileFilter from "../../entity/FileFilter";
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
            </div>
            {searchFormType()}
        </div>
    );
}
