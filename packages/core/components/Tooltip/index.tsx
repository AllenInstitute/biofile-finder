import { TooltipHost } from "@fluentui/react";
import * as React from "react";

import styles from "./Tooltip.module.css";

interface Props {
    children: React.ReactElement;
    content?: string;
    disabled?: boolean;
}

/**
 * A wrapper component that renders the children provided with a tooltip
 * that appears on hover.
 */
export default function Tooltip(props: Props) {
    if (!props.content || props.disabled) {
        return props.children;
    }

    return (
        <TooltipHost
            content={props.content}
            tooltipProps={{
                className: styles.container,
            }}
        >
            {props.children}
        </TooltipHost>
    );
}
