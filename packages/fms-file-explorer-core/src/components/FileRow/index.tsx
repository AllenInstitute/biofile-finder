import * as classNames from "classnames";
import { map } from "lodash";
import * as React from "react";

import Cell from "./Cell";

interface CellConfig {
    columnKey: string;
    displayValue: string;
    width: number;
}

interface FileRowProps {
    cells: CellConfig[];
    className?: string;
    onResize?: (columnKey: string, deltaX?: number) => void;
    rowWidth: number;
}

/**
 * A single row within the file list.
 */
export default function FileRow({ cells, className, onResize, rowWidth }: FileRowProps) {
    return (
        <div className={classNames(className)} style={{ width: rowWidth }}>
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
