import { castArray, find, isNil } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { AnnotationType } from "../../entity/AnnotationFormatter";
import FileFilter from "../../entity/FileFilter";
import ListPicker from "./ListPicker";
import { interaction, metadata, selection } from "../../state";
import useAnnotationValues from "./useAnnotationValues";
import { AnnotationValue } from "../../services/AnnotationService";

interface AnnotationFilterFormProps {
    annotationName: string;
}

export interface FilterItem {
    checked: boolean;
    displayValue: AnnotationValue;
    value: AnnotationValue;
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
    const annotations = useSelector(metadata.selectors.getAnnotations);
    const fileFilters = useSelector(selection.selectors.getFileFilters);
    const annotationService = useSelector(interaction.selectors.getAnnotationService);
    const [annotationValues, isLoading, errorMessage] = useAnnotationValues(
        annotationName,
        annotationService
    );

    const annotation = React.useMemo(
        () => find(annotations, (annotation) => annotation.name === annotationName),
        [annotations, annotationName]
    );

    const items = React.useMemo<FilterItem[]>(() => {
        const appliedFilters = fileFilters
            .filter((filter) => filter.name === annotation?.name)
            .map((filter) => filter.value);

        return (annotationValues || []).map((value) => ({
            checked: appliedFilters.includes(value),
            displayValue: annotation?.getDisplayValue(value) || value,
            value,
        }));
    }, [annotation, annotationValues, fileFilters]);

    const onDeselect = (value: AnnotationValue | AnnotationValue[]) => {
        const filters = castArray(value).map(
            (annotationValue) =>
                new FileFilter(
                    annotationName,
                    isNil(annotation?.valueOf(annotationValue))
                        ? annotationValue
                        : annotation?.valueOf(annotationValue)
                )
        );
        dispatch(selection.actions.removeFileFilter(filters));
    };

    const onSelect = (value: AnnotationValue | AnnotationValue[]) => {
        const filters = castArray(value).map(
            (annotationValue) =>
                new FileFilter(
                    annotationName,
                    isNil(annotation?.valueOf(annotationValue))
                        ? annotationValue
                        : annotation?.valueOf(annotationValue)
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
            return <ListPicker items={items} loading={isLoading} errorMessage={errorMessage} onDeselect={onDeselect} onSelect={onSelect} />;
    }
}
