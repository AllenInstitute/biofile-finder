import { find, isNil } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import useAnnotationValues from "./useAnnotationValues";
import ListPicker, { ListItem } from "../ListPicker";
import { AnnotationType } from "../../entity/AnnotationFormatter";
import FileFilter from "../../entity/FileFilter";
import { interaction, metadata, selection } from "../../state";

interface AnnotationFilterFormProps {
    name: string;
}

/**
 * A form that provides a user the ability to select particular annotation values with which
 * to filter the application's data. It will render different "value pickers" based on the type
 * of annotation: if the annotation is of type string, it will render a list for the user to choose
 * amongst its items; if the annotation is of type date, it will render a date input; etc.
 */
export default function AnnotationFilterForm(props: AnnotationFilterFormProps) {
    const dispatch = useDispatch();
    const annotations = useSelector(metadata.selectors.getAnnotations);
    const fileFilters = useSelector(selection.selectors.getFileFilters);
    const annotationService = useSelector(interaction.selectors.getAnnotationService);
    const [annotationValues, isLoading, errorMessage] = useAnnotationValues(
        props.name,
        annotationService
    );

    const annotation = React.useMemo(
        () => find(annotations, (annotation) => annotation.name === props.name),
        [annotations, props.name]
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
                    props.name,
                    isNil(annotation?.valueOf(item.value))
                        ? item.value
                        : annotation?.valueOf(item.value)
                )
        );
        dispatch(selection.actions.removeFileFilter(filters));
    };

    const onDeselect = (item: ListItem) => {
        const fileFilter = new FileFilter(
            props.name,
            isNil(annotation?.valueOf(item.value)) ? item.value : annotation?.valueOf(item.value)
        );
        dispatch(selection.actions.removeFileFilter(fileFilter));
    };

    const onSelect = (item: ListItem) => {
        const fileFilter = new FileFilter(
            props.name,
            isNil(annotation?.valueOf(item.value)) ? item.value : annotation?.valueOf(item.value)
        );
        dispatch(selection.actions.addFileFilter(fileFilter));
    };

    const onSelectAll = () => {
        const filters = items.map(
            (item) =>
                new FileFilter(
                    props.name,
                    isNil(annotation?.valueOf(item.value))
                        ? item.value
                        : annotation?.valueOf(item.value)
                )
        );
        dispatch(selection.actions.addFileFilter(filters));
    };

    // TODO, return different pickers based on annotation type
    // e.g., a date picker, a range (numeric) picker, etc.
    switch (annotation?.type) {
        case AnnotationType.STRING:
        // prettier-ignore
        default: // FALL-THROUGH
            return (
                <ListPicker
                    items={items}
                    loading={isLoading}
                    errorMessage={errorMessage}
                    onDeselect={onDeselect}
                    onDeselectAll={onDeselectAll}
                    onSelect={onSelect}
                    onSelectAll={items.length <= 100 ? onSelectAll : undefined}
                />
            );
    }
}
