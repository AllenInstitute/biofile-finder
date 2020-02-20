import { castArray } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { AnnotationValue } from "../../entity/Annotation";
import FileFilter from "../../entity/FileFilter";
import ListPicker from "./ListPicker";
import { makeFilterItemsSelector, makeAnnotationSelector } from "./selectors";
import { selection, State } from "../../state";

interface AnnotationFilterFormProps {
    annotationName: string;
}

export default function AnnotationFilterForm(props: AnnotationFilterFormProps) {
    const { annotationName } = props;

    const dispatch = useDispatch();
    const getAnnotation = React.useMemo(makeAnnotationSelector, []);
    const getFilterItems = React.useMemo(makeFilterItemsSelector, []);

    const annotation = useSelector((state: State) => getAnnotation(state, annotationName));
    const items = useSelector((state: State) => getFilterItems(state, annotationName));

    const onDeselect = (value: AnnotationValue | AnnotationValue[]) => {
        const filters = castArray(value).map((annotationValue) => {
            const val = annotation ? annotation.valueOf(annotationValue) : annotationValue;
            return new FileFilter(annotationName, val);
        });
        dispatch(selection.actions.removeFileFilter(filters));
    };

    const onSelect = (value: AnnotationValue | AnnotationValue[]) => {
        const filters = castArray(value).map((annotationValue) => {
            const val = annotation ? annotation.valueOf(annotationValue) : annotationValue;
            return new FileFilter(annotationName, val);
        });
        dispatch(selection.actions.addFileFilter(filters));
    };

    // TODO, return different pickers based on annotation type
    // e.g., a date picker, a range (numeric) picker, etc.
    return <ListPicker items={items} onDeselect={onDeselect} onSelect={onSelect} />;
}
