import { includes, map } from "lodash";
import * as React from "react";
import { useSelector } from "react-redux";

import Annotation from "../../entity/Annotation";
import { ColumnWidths } from "../FileList/useResizableColumns";
import FileRow from "../../components/FileRow";
import { selection } from "../../state";
import { FmsFile } from "./useFileFetcher";
import { OnSelect } from "./useFileSelector";

const styles = require("./style.module.css");

/**
 * Contextual data passed to LazilyRenderedRows by react-window. Basically a light-weight React context. The same data
 * is passed to each LazilyRenderedRow.
 */
export interface LazilyRenderedRowContext {
    columnWidths: ColumnWidths;
    displayAnnotations: Annotation[];
    files: Map<number, FmsFile>;
    level: number; // maps to how far indented the first column of the file row should be to
    onSelect: OnSelect;
    rowWidth: number;
}

interface LazilyRenderedRowProps {
    data: LazilyRenderedRowContext; // injected by react-window
    index: number; // injected by react-window
    style: React.CSSProperties; // injected by react-window
}

/**
 * A single file in the listing of available files FMS.
 */
export default function LazilyRenderedRow(props: LazilyRenderedRowProps) {
    const {
        data: { columnWidths, displayAnnotations, files, onSelect, rowWidth },
        index,
        style,
    } = props;
    const selectedFiles = useSelector(selection.selectors.getSelectedFiles);

    const file = files.get(index);

    const isSelected = React.useMemo(() => {
        if (file) {
            return includes(selectedFiles, file.file_id);
        }

        return false;
    }, [file, selectedFiles]);

    let content;
    if (file) {
        const cells = map(displayAnnotations, (annotation) => ({
            columnKey: annotation.name,
            displayValue: annotation.getDisplayValue(file),
            width: columnWidths.get(annotation.name),
        }));
        content = (
            <FileRow
                cells={cells}
                className={isSelected ? styles.selectedRow : undefined}
                rowIdentifier={index}
                onSelect={onSelect}
                rowWidth={rowWidth}
            />
        );
    } else {
        content = "Loading...";
    }

    return <div style={style}>{content}</div>;
}
