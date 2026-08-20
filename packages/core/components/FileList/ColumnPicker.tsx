import * as React from "react";
import { useSelector, useDispatch } from "react-redux";

import AnnotationPicker from "../AnnotationPicker";
import { ContextMenuItem } from "../ContextMenu";
import { selection } from "../../state";

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

export const COLUMN_PICKER_MENU_ITEMS: ContextMenuItem[] = [
    {
        key: "column-picker",
        text: "Column picker",
        onRender() {
            return <ColumnPicker />;
        },
    },
];
