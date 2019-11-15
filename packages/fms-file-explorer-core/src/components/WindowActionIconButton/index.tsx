import * as React from "react";

const styles = require("./WindowActionIconButton.module.css");

/**
 * Path data for icons taken from Material Design
 * Apache License 2.0 (https://github.com/google/material-design-icons/blob/master/LICENSE)
 */
export enum WindowAction {
    MINIMIZE = "M13 3.25C13 3.25 0 3.25 0 3.25 0 3.25 0 0 0 0 0 0 13 0 13 0",
    RESTORE = "M0 3.25C0 3.25 3.25 3.25 3.25 3.25 3.25 3.25 3.25 0 3.25 0 3.25 0 13 0 13 0 13 0 13 9.75 13 9.75 13 9.75 9.75 9.75 9.75 9.75 9.75 9.75 9.75 13 9.75 13 9.75 13 0 13 0 13 0 13 0 3.25 0 3.25M9.75 3.25C9.75 3.25 9.75 8.125 9.75 8.125 9.75 8.125 11.375 8.125 11.375 8.125 11.375 8.125 11.375 1.625 11.375 1.625 11.375 1.625 4.875 1.625 4.875 1.625 4.875 1.625 4.875 3.25 4.875 3.25 4.875 3.25 9.75 3.25 9.75 3.25M1.625 6.5C1.625 6.5 1.625 11.375 1.625 11.375 1.625 11.375 8.125 11.375 8.125 11.375 8.125 11.375 8.125 6.5 8.125 6.5 8.125 6.5 1.625 6.5 1.625 6.5 1.625 6.5 1.625 6.5 1.625 6.5",
    MAXIMIZE = "M0 0C0 0 13 0 13 0 13 0 13 13 13 13 13 13 0 13 0 13 0 13 0 0 0 0M1.625 3.25C1.625 3.25 1.625 11.375 1.625 11.375 1.625 11.375 11.375 11.375 11.375 11.375 11.375 11.375 11.375 3.25 11.375 3.25 11.375 3.25 1.625 3.25 1.625 3.25 1.625 3.25 1.625 3.25 1.625 3.25",
}

interface WindowActionIconButtonProps {
    action: WindowAction;
    fillColor?: string;
    height?: number; // px
    onClick?: () => void;
    width?: number; // px
}

// Necessary to account (in the viewBox) for the width/height of the SVGs as they were designed so that the icons scale
// properly
const actionToViewBoxMap: { [index: string]: string } = {
    [WindowAction.MINIMIZE]: "0 0 13 3.25",
    [WindowAction.RESTORE]: "0 0 13 13",
    [WindowAction.MAXIMIZE]: "0 0 13 13",
};

export default function WindowActionIconButton(props: WindowActionIconButtonProps) {
    const { action, fillColor, height, onClick, width } = props;
    return (
        <svg height={height} width={width} viewBox={actionToViewBoxMap[action]}>
            <rect
                className={styles.hitRect}
                fill="transparent"
                height={height}
                onClick={onClick}
                width={width}
            ></rect>
            <path
                d={action}
                strokeWidth="0"
                stroke="none"
                strokeDasharray="none"
                fill={fillColor}
                fillRule="evenodd"
            ></path>
        </svg>
    );
}

WindowActionIconButton.defaultProps = {
    fillColor: "rgb(170, 170, 170)", // arbitrary; gray
    height: 13, // arbitrary
    onClick: () => {
        /* noop */
    },
    width: 13, // arbitrary
};
