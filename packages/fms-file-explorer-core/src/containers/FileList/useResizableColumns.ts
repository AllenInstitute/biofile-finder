import { reduce } from "lodash";
import * as React from "react";

import Cell from "../../components/FileRow/Cell";

/**
 * Helper class for keeping track of column widths in the file list. Column widths are normalized by the measured width
 * of the file list container, i.e., as ratios of intended_column_width_at_a_given_container_width / given_container_width.
 * This is to ensure that as the window of the whole application is resized (and therefore as the file list container
 * grows and shrinks) that the columns grow and shrink proportionally.
 */
export class ColumnWidths {
    private cache: { [index: string]: number };
    private columns: string[];
    private rowWidth: number;

    constructor(rowWidth: number, columns: string[], cache: { [index: string]: number } = {}) {
        this.cache = cache;
        this.columns = columns;
        this.rowWidth = rowWidth;
    }

    public clone(): ColumnWidths {
        return new ColumnWidths(this.rowWidth, this.columns, { ...this.cache });
    }

    public get(key: string): number {
        let width;

        if (this.cache.hasOwnProperty(key)) {
            width = this.cache[key] * this.rowWidth;
        } else {
            width = this.defaultColumnWidth;
        }

        return Math.max(Cell.MINIMUM_WIDTH, width);
    }

    public getAccumulatedColumnWidths(): number {
        return reduce(this.columns, (accum, column) => accum + this.get(column), 0);
    }

    public reset(key: string): void {
        // deleting an item from the internal cache of column widths will cause getting the width for the column to use
        // a default value.
        delete this.cache[key];
    }

    public set(key: string, width: number): void {
        this.cache[key] = width / this.rowWidth;
    }

    public setRowWidth(rowWidth: number): void {
        this.rowWidth = rowWidth;
    }

    public setColumns(columns: string[]): void {
        this.columns = columns;
    }

    private get defaultColumnWidth() {
        return this.rowWidth / this.columns.length || 0;
    }
}

/**
 * Custom React hook to encapsulate logic for storing and updating state related to resizable file list columns.
 */
export default function useResizableColumns(
    containerWidth: number,
    columns: string[]
): [ColumnWidths, (columnKey: string, deltaX?: number) => void, number] {
    // Hold column width state
    const [columnWidths, setColumnWidths] = React.useState(
        () => new ColumnWidths(containerWidth, columns)
    );

    // When either the file list container width or the columns to display update, update state with a new ColumnWidths
    // instance that has those updated values
    React.useEffect(() => {
        const nextColumnWidths = columnWidths.clone();
        nextColumnWidths.setRowWidth(containerWidth);
        nextColumnWidths.setColumns(columns);
        setColumnWidths(nextColumnWidths);
    }, [containerWidth, columns]);

    // Callback to be provided to UI component that knows how to resize itself and needs to inform state held here of
    // the resize. Called with the column key (e.g., annotation.name) and optionally the deltaX of the resize event. If
    // called without a deltaX, the call is interpreted as a column width reset request.
    const onResize = React.useCallback((columnKey: string, deltaX?: number) => {
        setColumnWidths((prevColumnWidths) => {
            const prevColumnWidth = prevColumnWidths.get(columnKey);
            const nextColumnWidths = prevColumnWidths.clone();

            if (deltaX !== undefined) {
                nextColumnWidths.set(columnKey, prevColumnWidth + deltaX);
            } else {
                nextColumnWidths.reset(columnKey);
            }

            return nextColumnWidths;
        });
    }, []);

    // The accumulation of column widths held in state. This may be larger or smaller than `containerWidth`. If larger,
    // the file list container will overflow (scroll) in the x direction.
    const rowWidth = React.useMemo(() => columnWidths.getAccumulatedColumnWidths(), [columnWidths]);

    return [columnWidths, onResize, rowWidth];
}
