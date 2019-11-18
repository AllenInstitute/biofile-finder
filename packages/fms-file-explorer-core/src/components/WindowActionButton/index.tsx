import * as React from "react";

const styles = require("./WindowActionButton.module.css");

export enum WindowAction {
    MINIMIZE = "MINIMIZE",
    RESTORE = "RESTORE",
    MAXIMIZE = "MAXIMIZE",
}

interface WindowActionButtonProps {
    action: WindowAction;
    fillColor?: string;
    height?: number; // px
    onClick?: () => void;
    width?: number; // px
}

/**
 * Path data for icons taken from Material Design
 * Apache License 2.0 (https://github.com/google/material-design-icons/blob/master/LICENSE)
 */
const actionToPathDataMap: { [index: string]: string } = {
    [WindowAction.MINIMIZE]: "M13 3.25C13 3.25 0 3.25 0 3.25 0 3.25 0 0 0 0 0 0 13 0 13 0",
    [WindowAction.RESTORE]:
        "M0 3.25C0 3.25 3.25 3.25 3.25 3.25 3.25 3.25 3.25 0 3.25 0 3.25 0 13 0 13 0 13 0 13 9.75 13 9.75 13 9.75 9.75 9.75 9.75 9.75 9.75 9.75 9.75 13 9.75 13 9.75 13 0 13 0 13 0 13 0 3.25 0 3.25M9.75 3.25C9.75 3.25 9.75 8.125 9.75 8.125 9.75 8.125 11.375 8.125 11.375 8.125 11.375 8.125 11.375 1.625 11.375 1.625 11.375 1.625 4.875 1.625 4.875 1.625 4.875 1.625 4.875 3.25 4.875 3.25 4.875 3.25 9.75 3.25 9.75 3.25M1.625 6.5C1.625 6.5 1.625 11.375 1.625 11.375 1.625 11.375 8.125 11.375 8.125 11.375 8.125 11.375 8.125 6.5 8.125 6.5 8.125 6.5 1.625 6.5 1.625 6.5 1.625 6.5 1.625 6.5 1.625 6.5",
    [WindowAction.MAXIMIZE]:
        "M0 0C0 0 13 0 13 0 13 0 13 13 13 13 13 13 0 13 0 13 0 13 0 0 0 0M1.625 3.25C1.625 3.25 1.625 11.375 1.625 11.375 1.625 11.375 11.375 11.375 11.375 11.375 11.375 11.375 11.375 3.25 11.375 3.25 11.375 3.25 1.625 3.25 1.625 3.25 1.625 3.25 1.625 3.25 1.625 3.25",
};

// The viewbox includes the height and width of the SVG icons as they were designed to be rendered. Used to ensure the
// icons scale properly.
const actionToViewBoxMap: { [index: string]: string } = {
    [WindowAction.MINIMIZE]: "0 0 13 3.25",
    [WindowAction.RESTORE]: "0 0 13 13",
    [WindowAction.MAXIMIZE]: "0 0 13 13",
};

export default function WindowActionButton(props: WindowActionButtonProps) {
    const { action, fillColor, height, onClick, width } = props;

    return (
        <button className={styles.actionButton} style={{ width, height }} onClick={onClick}>
            <svg
                height="100%"
                width="100%"
                viewBox={actionToViewBoxMap[action]}
                preserveAspectRatio="xMidYMid"
            >
                <path
                    d={actionToPathDataMap[action]}
                    pointerEvents="none"
                    strokeWidth="0"
                    stroke="none"
                    strokeDasharray="none"
                    fill={fillColor}
                    fillRule="evenodd"
                ></path>
            </svg>
        </button>
    );
}

WindowActionButton.defaultProps = {
    fillColor: "rgb(170, 170, 170)", // arbitrary; gray
    height: 23, // arbitrary
    onClick: () => {
        /* noop */
    },
    width: 23, // arbitrary
};
