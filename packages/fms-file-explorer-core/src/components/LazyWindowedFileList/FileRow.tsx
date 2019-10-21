import { omit } from "lodash";
import * as React from "react";

import { FmsFile } from "../LazyWindowedFileList/useFileFetcher";

/**
 * Contextual data passed to FileRows by react-window. Basically a light-weight React context. The same data is passed
 * to each FileRow.
 */
export interface FileRowContext {
    files: Map<number, FmsFile>;
    level: number; // maps to how far indented the first column of the file row should be
}

interface FileRowProps {
    data: FileRowContext; // injected by react-window
    index: number; // injected by react-window
    style: React.CSSProperties; // injected by react-window
}

/**
 * A single file in the listing of available files FMS.
 */
export default function FileRow(props: FileRowProps) {
    const { data, index } = props;

    let content;

    if (data.files.has(index)) {
        content = JSON.stringify(omit(props.data.files.get(props.index), "file_index"));
    } else {
        content = "Loading...";
    }

    return <div style={props.style}>{content}</div>;
}
