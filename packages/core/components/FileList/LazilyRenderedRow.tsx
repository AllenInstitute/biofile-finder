import { IShimmerColors, Shimmer } from "@fluentui/react";
import classNames from "classnames";
import { map } from "lodash";
import * as React from "react";
import { useSelector } from "react-redux";

import { OnSelect } from "./useFileSelector";
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

const MARGIN = 1.5; // px; defined in LazilyRenderedRow.module.css

/**
 * A single file in the listing of available files FMS.
 */
export default function LazilyRenderedRow(props: LazilyRenderedRowProps) {
    const {
        data: { fileSet, onContextMenu, onSelect },
        index,
        style,
    } = props;

    const columns = useSelector(selection.selectors.getColumns);
    const isSmallFont = useSelector(selection.selectors.getShouldDisplaySmallFont);
    const annotationNameToAnnotationMap = useSelector(
        metadata.selectors.getAnnotationNameToAnnotationMap
    );
    const fileSelection = useSelector(selection.selectors.getFileSelection);

    const file = fileSet.getFileByIndex(index);

    const isSelected = React.useMemo(() => fileSelection.isSelected(fileSet, index), [
        fileSelection,
        fileSet,
        index,
    ]);

    const isFocused = React.useMemo(() => fileSelection.isFocused(fileSet, index), [
        fileSelection,
        fileSet,
        index,
    ]);

    let content: React.ReactElement;
    if (file) {
        content = (
            <FileRow
                cells={map(columns, (column) => ({
                    columnKey: column.name,
                    displayValue: annotationNameToAnnotationMap[column.name]?.extractFromFile(file),
                    width: column.width,
                }))}
                rowIdentifier={{ index, id: file.uid }}
                onSelect={onSelect}
            />
        );
    } else {
        // Unable to convince FluentUI to style the shimmer wave pattern accurately
        // with pure css so have to rely on extracting the colors from the global document
        // here and then applying them directly
        const globalStyle = getComputedStyle(document.body);
        const shimmerColors: IShimmerColors = {
            background: globalStyle.getPropertyValue("--primary-dark"),
            shimmer: globalStyle.getPropertyValue("--primary-dark"),
            shimmerWave: globalStyle.getPropertyValue("--aqua"),
        };
        content = <Shimmer className={styles.shimmer} shimmerColors={shimmerColors} />;
    }

    return (
        <div
            className={classNames(styles.row, {
                [styles.selected]: isSelected,
                [styles.focused]: isFocused,
                [styles.smallFont]: isSmallFont,
            })}
            style={{
                ...style,
                width: `calc(100% - ${2 * MARGIN}px)`,
            }}
            onContextMenu={onContextMenu}
        >
            {content}
        </div>
    );
}
