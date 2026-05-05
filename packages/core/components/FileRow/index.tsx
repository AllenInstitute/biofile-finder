import classNames from "classnames";
import * as React from "react";
import { useSelector } from "react-redux";

import Cell from "./Cell";
import { OnSelect } from "../FileList/useFileSelector";
import HorizontalScrollContext from "../FileList/HorizontalScrollContext";
import { selection } from "../../state";

import styles from "./FileRow.module.css";

export interface CellConfig {
    className?: string;
    columnKey: string;
    displayValue: string | React.ReactNode;
    title?: string;
    width: number;
}

interface FileRowProps {
    cells: CellConfig[];
    className?: string;
    rowIdentifier?: { index: number; id: string };
    onContextMenu?: (evt: React.MouseEvent) => void;
    onResize?: (columnKey: string, nextWidth?: number) => void;
    onSelect?: OnSelect;
}

// Number of pixels to render beyond the visible area on each side
const OVERSCAN = 200;

/**
 * A single row within the file list. Virtualizes cells horizontally so that
 * only those within (or near) the visible scroll area are rendered.
 */
export default function FileRow(props: FileRowProps) {
    const { cells, className, rowIdentifier, onContextMenu, onResize, onSelect } = props;

    const shouldDisplaySmallFont = useSelector(selection.selectors.getShouldDisplaySmallFont);
    const { scrollLeft, containerWidth } = React.useContext(HorizontalScrollContext);

    const onClick = (evt: React.MouseEvent) => {
        evt.preventDefault();
        evt.stopPropagation();

        if (onSelect && rowIdentifier !== undefined) {
            onSelect(rowIdentifier, {
                // Details on different OS keybindings
                // https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent#Properties
                ctrlKeyIsPressed: evt.ctrlKey || evt.metaKey,
                shiftKeyIsPressed: evt.shiftKey,
            });
        }
    };

    // Determine visible range of cells based on horizontal scroll position.
    // Use a spacer before and after for off-screen cells to preserve correct layout.
    const visibleCells = React.useMemo(() => {
        // If no container width yet (not measured), render all cells
        if (!containerWidth) {
            return { startIndex: 0, endIndex: Math.min(6, cells.length), leftPad: 0, rightPad: 0 };
        }

        const viewStart = scrollLeft - OVERSCAN;
        const viewEnd = scrollLeft + containerWidth + OVERSCAN;

        let cumulativeLeft = 0;
        let startIndex = 0;
        let endIndex = cells.length;
        let leftPad = 0;
        let rightPad = 0;

        // Find first visible cell
        for (let i = 0; i < cells.length; i++) {
            if (cumulativeLeft + cells[i].width > viewStart) {
                startIndex = i;
                leftPad = cumulativeLeft;
                break;
            }
            cumulativeLeft += cells[i].width;
        }

        // Find last visible cell
        cumulativeLeft = leftPad;
        for (let i = startIndex; i < cells.length; i++) {
            cumulativeLeft += cells[i].width;
            if (cumulativeLeft >= viewEnd) {
                endIndex = i + 1;
                break;
            }
        }

        // Calculate right padding
        for (let i = endIndex; i < cells.length; i++) {
            rightPad += cells[i].width;
        }

        return { startIndex, endIndex, leftPad, rightPad };
    }, [cells, scrollLeft, containerWidth]);

    const { startIndex, endIndex, leftPad, rightPad } = visibleCells;

    return (
        <div className={classNames(styles.row, className)} onClick={onClick}>
            {leftPad > 0 && <div style={{ display: "inline-block", width: `${leftPad}px` }} />}
            {cells.slice(startIndex, endIndex).map((cell) => (
                <Cell
                    className={classNames(cell.className, {
                        [styles.smallFont]: shouldDisplaySmallFont,
                    })}
                    key={cell.columnKey}
                    columnKey={cell.columnKey}
                    onContextMenu={onContextMenu}
                    onResize={onResize}
                    title={cell.title}
                    width={cell.width}
                >
                    {cell.displayValue}
                </Cell>
            ))}
            {rightPad > 0 && <div style={{ display: "inline-block", width: `${rightPad}px` }} />}
        </div>
    );
}
