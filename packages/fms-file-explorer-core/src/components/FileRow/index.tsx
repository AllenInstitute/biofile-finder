import * as classNames from "classnames";
import { map } from "lodash";
import * as React from "react";

import Cell from "./Cell";

interface CellConfig {
    columnKey: string;
    displayValue: string;
    width: number;
}

interface FileRowProps<T = any> {
    cells: CellConfig[];
    className?: string;
    rowIdentifier?: T;
    onResize?: (columnKey: string, deltaX?: number) => void;
    onSelect?: (rowIdentifier: T, ctrlKeyIsPressed: boolean) => void;
    rowWidth: number;
}

/**
 * A single row within the file list.
 */
export default function FileRow(props: FileRowProps) {
    const { cells, className, rowIdentifier, onResize, onSelect, rowWidth } = props;
    const onClick = React.useCallback(
        (evt: React.MouseEvent) => {
            if (onSelect && rowIdentifier) {
                onSelect(rowIdentifier, evt.ctrlKey);
            }
        },
        [rowIdentifier, onSelect]
    );

    return (
        <div className={classNames(className)} onClick={onClick} style={{ width: rowWidth }}>
            {map(cells, (cell) => (
                <Cell
                    key={cell.columnKey}
                    columnKey={cell.columnKey}
                    onResize={onResize}
                    width={cell.width}
                >
                    {cell.displayValue}
                </Cell>
            ))}
        </div>
    );
}
