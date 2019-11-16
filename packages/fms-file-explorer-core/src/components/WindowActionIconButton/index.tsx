import { map, values } from "lodash";
import * as React from "react";

const styles = require("./WindowActionIconButton.module.css");

export enum WindowAction {
    MINIMIZE = "MINIMIZE",
    RESTORE = "RESTORE",
    MAXIMIZE = "MAXIMIZE",
}

interface WindowActionIconButtonProps {
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

// The height and width of the SVG icons as they were designed to be rendered. Used to ensure the icons scale properly.
const actionToViewBoxMap: { [index: string]: { height: number; width: number } } = {
    [WindowAction.MINIMIZE]: { height: 3.25, width: 13 },
    [WindowAction.RESTORE]: { height: 13, width: 13 },
    [WindowAction.MAXIMIZE]: { height: 8, width: 13 },
};

const LARGEST_VIEWBOX_HEIGHT = Math.max.apply(null, map(values(actionToViewBoxMap), "height"));

export default function WindowActionIconButton(props: WindowActionIconButtonProps) {
    const { action, fillColor, height, onClick, width } = props;

    const { height: viewBoxHeight, width: viewBoxWidth } = actionToViewBoxMap[action];

    // The hit rects should all be the same height and width and be aligned along their y-axis. Because the MINIMIZE
    // icon is designed to be shorter than the others (i.e., has a smaller viewport height), need to fiddle with the y
    // placement of its hit rect to ensure it aligns with the others. The following solves the problem in the general
    // case.
    const rectY =
        viewBoxHeight !== LARGEST_VIEWBOX_HEIGHT ? -(viewBoxHeight + viewBoxHeight / 2) : 0;

    return (
        <svg
            height={height}
            width={width}
            viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
            preserveAspectRatio="xMidYMid"
        >
            <rect
                className={styles.hitRect}
                fill="transparent"
                height={LARGEST_VIEWBOX_HEIGHT}
                onClick={onClick}
                width="100%"
                y={rectY}
            ></rect>
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
