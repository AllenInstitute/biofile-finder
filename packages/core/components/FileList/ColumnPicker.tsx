import * as React from "react";
import { useSelector, useDispatch } from "react-redux";

import AnnotationPicker from "../AnnotationPicker";
import { selection } from "../../state";

/**
 * Picker for selecting which columns to display in the file list.
 */
export default function ColumnPicker() {
    const dispatch = useDispatch();
    const columnAnnotations = useSelector(selection.selectors.getAnnotationsToDisplay);

    return (
        <AnnotationPicker
            selections={columnAnnotations}
            setSelections={(annotations) => {
                // Prevent de-selecting all columns
                if (!annotations.length) {
                    dispatch(selection.actions.setDisplayAnnotations([columnAnnotations[0]]));
                } else {
                    dispatch(selection.actions.setDisplayAnnotations(annotations));
                }
            }}
        />
    );
}
