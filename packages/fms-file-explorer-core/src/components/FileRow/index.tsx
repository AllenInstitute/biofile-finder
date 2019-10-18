import { omit } from "lodash";
import * as React from "react";

import { FmsFile } from "../../state/file/reducer";

interface FileRowProps {
    data: Map<number, FmsFile>; // injected by react-window
    index: number; // injected by react-window
    style: React.CSSProperties; // injected by react-window
}

/**
 * A single file in the listing of available files FMS.
 */
export default function FileRow(props: FileRowProps) {
    const { data, index } = props;

    let content;

    if (data.has(index)) {
        content = JSON.stringify(omit(props.data.get(props.index), "file_index"));
    } else {
        content = "Loading...";
    }

    return <div style={props.style}>{content}</div>;
}
