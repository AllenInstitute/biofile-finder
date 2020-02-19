import { castArray } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { AnnotationValue } from "../../entity/Annotation";
import FileFilter from "../../entity/FileFilter";
import ListPicker from "./ListPicker";
import { makeFilterItemsSelector } from "./selectors";
import { selection, State } from "../../state";

interface AnnotationFilterFormProps {
    annotationName: string;
}

export default function AnnotationFilterForm(props: AnnotationFilterFormProps) {
    const { annotationName } = props;

    const dispatch = useDispatch();
    const getAnnotationValueFilters = React.useMemo(makeFilterItemsSelector, []);
    const items = useSelector((state: State) => getAnnotationValueFilters(state, annotationName));

    const onDeselect = (value: AnnotationValue | AnnotationValue[]) => {
        const filters = castArray(value).map(
            (annotationValue) => new FileFilter(annotationName, annotationValue)
        );
        dispatch(selection.actions.removeFileFilter(filters));
    };

    const onSelect = (value: AnnotationValue | AnnotationValue[]) => {
        const filters = castArray(value).map(
            (annotationValue) => new FileFilter(annotationName, annotationValue)
        );
        dispatch(selection.actions.addFileFilter(filters));
    };

    // TODO, return different pickers based on annotation type
    // e.g., a date picker, a range (numeric) picker, etc.
    return <ListPicker items={items} onDeselect={onDeselect} onSelect={onSelect} />;
}
