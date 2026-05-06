import classNames from "classnames";
import * as React from "react";
import { useSelector } from "react-redux";

import Cell from "./Cell";
import { OnSelect } from "../FileList/useFileSelector";
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
    // Used by Header and Row to add padding for overscanning purposes.
    // The padding is added to the left and right of the row, and is
    // meant to be large enough to accommodate the scrollbar width as well as some buffer.
    padding?: { left: number; right: number };
}

/**
 * A single row within the file list. Virtualizes cells horizontally so that
 * only those within (or near) the visible scroll area are rendered.
 */
export default function FileRow(props: FileRowProps) {
    const { cells, className, rowIdentifier, onContextMenu, onResize, onSelect } = props;

    const shouldDisplaySmallFont = useSelector(selection.selectors.getShouldDisplaySmallFont);

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

    return (
        <div
            className={classNames(styles.row, className)}
            onClick={onClick}
            style={{ paddingLeft: props.padding?.left, paddingRight: props.padding?.right }}
        >
            {cells.map((cell) => (
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
        </div>
    );
}
