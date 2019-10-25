import { map } from "lodash";
import * as React from "react";

import Annotation from "../../entity/Annotation";
import { ColumnWidths } from "../../containers/FileList/useResizableColumns";
import FileRow from "../FileRow";
import { FmsFile } from "./useFileFetcher";

/**
 * Contextual data passed to LazilyRenderedRows by react-window. Basically a light-weight React context. The same data
 * is passed to each LazilyRenderedRow.
 */
export interface LazilyRenderedRowContext {
    columnWidths: ColumnWidths;
    displayAnnotations: Annotation[];
    files: Map<number, FmsFile>;
    level: number; // maps to how far indented the first column of the file row should be to
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
        data: { columnWidths, displayAnnotations, files, rowWidth },
        index,
        style,
    } = props;

    let content;

    const file = files.get(index);
    if (file) {
        const cells = map(displayAnnotations, (annotation) => ({
            columnKey: annotation.name,
            displayValue: annotation.getDisplayValue(file),
            width: columnWidths.get(annotation.name),
        }));
        content = <FileRow cells={cells} rowWidth={rowWidth} />;
    } else {
        content = "Loading...";
    }

    return <div style={style}>{content}</div>;
}
