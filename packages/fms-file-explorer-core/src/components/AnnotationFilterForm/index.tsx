import { castArray, find } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { AnnotationValue } from "../../entity/Annotation";
import { AnnotationType } from "../../entity/AnnotationFormatter";
import FileFilter from "../../entity/FileFilter";
import ListPicker from "./ListPicker";
import { metadata, selection } from "../../state";

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

    const annotation = React.useMemo(
        () => find(annotations, (annotation) => annotation.name === annotationName),
        [annotations, annotationName]
    );

    const items = React.useMemo<FilterItem[]>(() => {
        const appliedFilters = fileFilters
            .filter((filter) => filter.name === annotation?.name)
            .map((filter) => filter.value);

        return (annotation?.values || []).map((value) => ({
            checked: appliedFilters.includes(value),
            displayValue: annotation?.getDisplayValue(value) || value,
            value,
        }));
    }, [annotation, fileFilters]);

    const onDeselect = (value: AnnotationValue | AnnotationValue[]) => {
        const filters = castArray(value).map(
            (annotationValue) =>
                new FileFilter(
                    annotationName,
                    annotation?.valueOf(annotationValue) || annotationValue
                )
        );
        dispatch(selection.actions.removeFileFilter(filters));
    };

    const onSelect = (value: AnnotationValue | AnnotationValue[]) => {
        const filters = castArray(value).map(
            (annotationValue) =>
                new FileFilter(
                    annotationName,
                    annotation?.valueOf(annotationValue) || annotationValue
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
            return <ListPicker items={items} onDeselect={onDeselect} onSelect={onSelect} />;
    }
}
