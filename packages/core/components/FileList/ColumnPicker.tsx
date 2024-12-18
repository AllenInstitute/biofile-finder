import * as React from "react";
import { useSelector, useDispatch } from "react-redux";

import AnnotationPicker from "../AnnotationPicker";
import { selection } from "../../state";

/**
 * Picker for selecting which columns to display in the file list.
 */
export default function ColumnPicker() {
    const dispatch = useDispatch();
    const columns = useSelector(selection.selectors.getColumns);
    const columnNames = useSelector(selection.selectors.getColumnNames);

    return (
        <AnnotationPicker
            title="Select metadata to display as columns"
            selections={columnNames}
            setSelections={(selectedColumns) => {
                const adjustedColumns = columns.filter((column) =>
                    selectedColumns.includes(column.name)
                );
                selectedColumns.forEach((selectedColumn) => {
                    if (!columnNames.includes(selectedColumn)) {
                        adjustedColumns.push({
                            name: selectedColumn,
                            width: 0.25, // Default width of 25%
                        });
                    }
                });
                dispatch(selection.actions.setColumns(adjustedColumns));
            }}
        />
    );
}
