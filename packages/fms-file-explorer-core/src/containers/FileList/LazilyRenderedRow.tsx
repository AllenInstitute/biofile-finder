import { includes, map } from "lodash";
import * as React from "react";
import { useSelector } from "react-redux";

import FileRow from "../../components/FileRow";
import FileSet from "../../entity/FileSet";
import { selection } from "../../state";
import { OnSelect } from "./useFileSelector";

const styles = require("./FileList.module.css");

/**
 * Contextual data passed to LazilyRenderedRows by react-window. Basically a light-weight React context. The same data
 * is passed to each LazilyRenderedRow within the same FileList.
 */
export interface LazilyRenderedRowContext {
    fileSet: FileSet;
    onSelect: OnSelect;
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
        data: { fileSet, onSelect },
        index,
        style,
    } = props;

    const annotations = useSelector(selection.selectors.getAnnotationsToDisplay);
    const selectedFiles = useSelector(selection.selectors.getSelectedFiles);

    const file = fileSet.getFileByIndex(index);

    const isSelected = React.useMemo(() => {
        if (file) {
            return includes(selectedFiles, file.file_id);
        }

        return false;
    }, [file, selectedFiles]);

    let content;
    if (file) {
        const cells = map(annotations, (annotation) => ({
            columnKey: annotation.name,
            displayValue: annotation.getDisplayValue(file),
            width: 1 / annotations.length,
        }));
        content = (
            <FileRow
                cells={cells}
                className={isSelected ? styles.selectedRow : undefined}
                rowIdentifier={{ index, id: file.file_id }}
                onSelect={onSelect}
            />
        );
    } else {
        content = "Loading...";
    }

    return <div style={style}>{content}</div>;
}
