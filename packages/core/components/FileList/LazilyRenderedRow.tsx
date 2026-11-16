import classNames from "classnames";
import { map } from "lodash";
import * as React from "react";
import { useSelector } from "react-redux";

import { LoadingBar, placeholderBarWidth } from "./LoadingPlaceholder";
import { OnSelect } from "./useFileSelector";
import useVisibleColumns from "./useVisibleCells";
import FileRow from "../../components/FileRow";
import FileSet from "../../entity/FileSet";
import { metadata, selection } from "../../state";

import styles from "./LazilyRenderedRow.module.css";

/**
 * Contextual data passed to LazilyRenderedRows by react-window. Basically a light-weight React context. The same data
 * is passed to each LazilyRenderedRow within the same FileList.
 */
export interface LazilyRenderedRowContext {
    fileSet: FileSet;
    onContextMenu: (evt: React.MouseEvent) => void;
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
        data: { fileSet, onContextMenu, onSelect },
        index,
        style,
    } = props;

    const { columns: visibleColumns, padding } = useVisibleColumns();
    const totalColumnWidth = useSelector(selection.selectors.getTotalColumnWidth);
    const isSmallFont = useSelector(selection.selectors.getShouldDisplaySmallFont);
    const annotationNameToAnnotationMap = useSelector(
        metadata.selectors.getAnnotationNameToAnnotationMap
    );
    const fileSelection = useSelector(selection.selectors.getFileSelection);

    const file = fileSet.getFileByIndex(index);

    const isSelected = React.useMemo(
        () => fileSelection.isSelected(fileSet, index),
        [fileSelection, fileSet, index]
    );

    const isFocused = React.useMemo(
        () => fileSelection.isFocused(fileSet, index),
        [fileSelection, fileSet, index]
    );

    let content: React.ReactElement;
    if (file) {
        content = (
            <FileRow
                cells={map(visibleColumns, (column) => ({
                    columnKey: column.name,
                    displayValue: annotationNameToAnnotationMap
                        .get(column.name)
                        ?.extractFromFile(file),
                    width: column.width,
                }))}
                rowIdentifier={{ index, id: file.uid }}
                onSelect={onSelect}
                padding={padding}
            />
        );
    } else {
        content = (
            <FileRow
                cells={map(visibleColumns, (column, columnIndex) => ({
                    className: styles.loadingCell,
                    columnKey: column.name,
                    displayValue: <LoadingBar width={placeholderBarWidth(index, columnIndex)} />,
                    width: column.width,
                }))}
                padding={padding}
            />
        );
    }

    return (
        <div
            className={classNames(styles.row, {
                [styles.selected]: isSelected,
                [styles.focused]: isFocused,
                [styles.smallFont]: isSmallFont,
                [styles.evenRow]: index % 2 === 0,
            })}
            style={{
                ...style,
                width: `${totalColumnWidth}px`,
            }}
            onContextMenu={onContextMenu}
        >
            {content}
        </div>
    );
}
