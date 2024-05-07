import classNames from "classnames";
import { map } from "lodash";
import * as React from "react";
import { useSelector } from "react-redux";

import Cell from "./Cell";
import { OnSelect } from "../FileList/useFileSelector";
import { selection } from "../../state";

import styles from "./FileRow.module.css";

export interface CellConfig {
    columnKey: string;
    displayValue: string | React.ReactNode;
    width: number;
}

interface FileRowProps {
    cells: CellConfig[];
    className?: string;
    rowIdentifier?: any;
    onContextMenu?: (evt: React.MouseEvent) => void;
    onResize?: (columnKey: string, nextWidth?: number) => void;
    onSelect?: OnSelect;
}

/**
 * A single row within the file list.
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
        <div className={classNames(styles.row, className)} onClick={onClick}>
            {map(cells, (cell) => (
                <Cell
                    className={classNames({ [styles.smallFont]: shouldDisplaySmallFont })}
                    key={cell.columnKey}
                    columnKey={cell.columnKey}
                    onContextMenu={onContextMenu}
                    onResize={onResize}
                    width={cell.width}
                >
                    {cell.displayValue}
                </Cell>
            ))}
        </div>
    );
}
