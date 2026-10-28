import classNames from "classnames";
import * as React from "react";

import styles from "./LoadingPlaceholder.module.css";

// Stand-in column widths for a file list whose real columns aren't known yet.
export const PLACEHOLDER_COLUMN_WIDTHS = [180, 140, 110, 160, 120];

// Fall back to enough rows to look like a list when the list's height hasn't been measured yet
const DEFAULT_PLACEHOLDER_ROW_COUNT = 14;
const MAX_PLACEHOLDER_ROW_COUNT = 60;

// How much of its cell each bar fills
const BAR_WIDTHS = ["85%", "60%", "72%", "45%", "78%", "55%"];

/**
 * How wide the stand-in bar at this position should be.
 */
export function placeholderBarWidth(rowIndex: number, columnIndex: number): string {
    return BAR_WIDTHS[(rowIndex + columnIndex) % BAR_WIDTHS.length];
}

interface LoadingBarProps {
    className?: string;
    width?: string;
}

/**
 * A single shimmering bar standing in for a value that hasn't arrived yet.
 */
export function LoadingBar(props: LoadingBarProps) {
    return (
        <div
            className={classNames(styles.bar, props.className)}
            style={props.width ? { width: props.width } : undefined}
        />
    );
}

interface LoadingPlaceholderProps {
    className?: string;
    height?: number;
    rowHeight: number;
}

/**
 * Placeholder rows shown where the file list will be, while the selected data source is still being
 * prepared and its columns read.
 */
export default function LoadingPlaceholder({
    className,
    height,
    rowHeight,
}: LoadingPlaceholderProps) {
    const rowCount = Math.min(
        MAX_PLACEHOLDER_ROW_COUNT,
        height && rowHeight ? Math.ceil(height / rowHeight) : DEFAULT_PLACEHOLDER_ROW_COUNT
    );

    return (
        <div
            aria-label="Loading data source columns"
            className={classNames(styles.placeholder, className)}
            role="status"
        >
            {Array.from({ length: rowCount }, (_, rowIndex) => (
                <div
                    aria-hidden="true"
                    className={styles.row}
                    key={rowIndex}
                    style={{ height: rowHeight }}
                >
                    {PLACEHOLDER_COLUMN_WIDTHS.map((columnWidth, columnIndex) => (
                        <div
                            className={styles.cell}
                            key={columnIndex}
                            style={{ width: columnWidth }}
                        >
                            <LoadingBar width={placeholderBarWidth(rowIndex, columnIndex)} />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
