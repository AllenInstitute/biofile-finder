import * as React from "react";
import { useSelector, useDispatch } from "react-redux";

import AnnotationPicker from "../AnnotationPicker";
import { metadata, selection } from "../../state";

/**
 * Picker for selecting which columns to display in the file list.
 */
export default function ColumnPicker() {
    const dispatch = useDispatch();
    const annotations = useSelector(metadata.selectors.getAnnotations);
    const columnAnnotations = useSelector(selection.selectors.getAnnotationsToDisplay);

    return (
        <AnnotationPicker
            title="Select metadata to display as columns"
            selections={columnAnnotations.map((c) => c.name)}
            setSelections={(selectedAnnotations) => {
                // Prevent de-selecting all columns
                if (!selectedAnnotations.length) {
                    dispatch(selection.actions.setDisplayAnnotations([columnAnnotations[0]]));
                } else {
                    dispatch(
                        selection.actions.setDisplayAnnotations(
                            annotations.filter((a) => selectedAnnotations.includes(a.name))
                        )
                    );
                }
            }}
        />
    );
}
