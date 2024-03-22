import { Spinner, SpinnerSize } from "@fluentui/react";
import { find, isNil } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { AnnotationType } from "../../entity/AnnotationFormatter";
import FileFilter from "../../entity/FileFilter";
import ListPicker, { ListItem } from "../ListPicker";
import NumberRangePicker from "../NumberRangePicker";
import SearchBoxForm from "../SearchBoxForm";
import DateRangePicker from "../DateRangePicker";
import { interaction, metadata, selection } from "../../state";
import useAnnotationValues from "./useAnnotationValues";

interface AnnotationFilterFormProps {
    annotationName: string;
}

/**
 * A form that provides a user the ability to select particular annotation values with which
 * to filter the application's data. It will render different "value pickers" based on the type
 * of annotation: if the annotation is of type string, it will render a list for the user to choose
 * amongst its items; if the annotation is of type date, it will render a date input; etc.
 */
export default function AnnotationFilterForm(props: AnnotationFilterFormProps) {
    const { annotationName } = props;
    const dispatch = useDispatch();
    const annotations = useSelector(metadata.selectors.getSupportedAnnotations);
    const fileFilters = useSelector(selection.selectors.getFileFilters);
    const annotationService = useSelector(interaction.selectors.getAnnotationService);
    // TODO: annotationService throws an error for annotations that aren't in the API
    const [annotationValues, isLoading, errorMessage] = useAnnotationValues(
        annotationName,
        annotationService
    );

    const annotation = React.useMemo(
        () => find(annotations, (annotation) => annotation.name === annotationName),
        [annotations, annotationName]
    );

    const currentValues = React.useMemo(
        () => find(fileFilters, (annotation) => annotation.name === annotationName),
        [annotationName, fileFilters]
    );

    const items = React.useMemo<ListItem[]>(() => {
        const appliedFilters = fileFilters
            .filter((filter) => filter.name === annotation?.name)
            .map((filter) => filter.value);

        return (annotationValues || []).map((value) => ({
            selected: appliedFilters.includes(value),
            displayValue: annotation?.getDisplayValue(value) || value,
            value,
        }));
    }, [annotation, annotationValues, fileFilters]);

    const onDeselectAll = () => {
        const filters = items.map(
            (item) =>
                new FileFilter(
                    annotationName,
                    isNil(annotation?.valueOf(item.value))
                        ? item.value
                        : annotation?.valueOf(item.value)
                )
        );
        dispatch(selection.actions.removeFileFilter(filters));
    };

    const onDeselect = (item: ListItem) => {
        const fileFilter = new FileFilter(
            annotationName,
            isNil(annotation?.valueOf(item.value)) ? item.value : annotation?.valueOf(item.value)
        );
        dispatch(selection.actions.removeFileFilter(fileFilter));
    };

    const onSelect = (item: ListItem) => {
        const fileFilter = new FileFilter(
            annotationName,
            isNil(annotation?.valueOf(item.value)) ? item.value : annotation?.valueOf(item.value)
        );
        dispatch(selection.actions.addFileFilter(fileFilter));
    };

    const onSelectAll = () => {
        const filters = items.map(
            (item) =>
                new FileFilter(
                    annotationName,
                    isNil(annotation?.valueOf(item.value))
                        ? item.value
                        : annotation?.valueOf(item.value)
                )
        );
        dispatch(selection.actions.addFileFilter(filters));
    };

    function onSearch(filterValue: string) {
        if (filterValue && filterValue.trim()) {
            const fileFilter = new FileFilter(annotationName, filterValue);
            if (currentValues) {
                console.info("currentValues", currentValues);
                console.info("fileFilter", fileFilter);

                dispatch(selection.actions.removeFileFilter(currentValues));
            }
            dispatch(selection.actions.addFileFilter(fileFilter));
        }
    }

    function onReset() {
        if (currentValues) {
            dispatch(selection.actions.removeFileFilter(currentValues));
        }
    }

    const listPicker = () => {
        return (
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
    };

    if (isLoading) {
        return (
            <div>
                <Spinner size={SpinnerSize.small} />
            </div>
        );
    }

    const customInput = () => {
        switch (annotation?.type) {
            case AnnotationType.DATE:
            case AnnotationType.DATETIME:
                return (
                    <DateRangePicker
                        onSearch={onSearch}
                        onReset={onReset}
                        currentRange={currentValues}
                    />
                );
            case AnnotationType.NUMBER:
                return (
                    <NumberRangePicker
                        items={items}
                        loading={isLoading}
                        errorMessage={errorMessage}
                        onSearch={onSearch}
                        onReset={onReset}
                        currentRange={currentValues}
                        units={annotation?.units}
                    />
                );
            case AnnotationType.DURATION:
            case AnnotationType.STRING:
            // prettier-ignore
            default: // FALL-THROUGH
                return (
                    <> {listPicker()} </>
                );
        }
    };
    // Use the checkboxes if values exist and are few enough to reasonably scroll through
    if (items.length > 0 && items.length <= 100) {
        return <> {listPicker()} </>;
    }
    // Use a search box if the API does not return values to select
    // (e.g., it's not an AICS annotation)
    else if (items.length === 0 && annotation?.type === AnnotationType.STRING) {
        return (
            <SearchBoxForm
                onSearch={onSearch}
                onReset={onReset}
                fieldName={annotation.name}
                currentValue={currentValues}
            />
        );
    }
    return <> {customInput()} </>;
}
