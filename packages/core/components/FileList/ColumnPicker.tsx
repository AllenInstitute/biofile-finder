import * as React from "react";
import { useSelector, useDispatch } from "react-redux";

import AnnotationPicker from "../AnnotationPicker";
import { selection } from "../../state";

/**
 * Picker for selecting which of the available annotations to display as columns in the file list.
 */
export default function ColumnPicker() {
    const dispatch = useDispatch();
    const columnNames = useSelector(selection.selectors.getColumnNames);

    return (
        <AnnotationPicker
            hasSelectAllCapability
            title="Select metadata to display as columns"
            selections={columnNames}
            setSelections={(selectedColumns) =>
                dispatch(selection.actions.selectColumns(selectedColumns))
            }
        />
    );
}
