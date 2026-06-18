import { Icon } from "@fluentui/react";
import * as React from "react";

import Tooltip from "../../Tooltip";

import styles from "./ContentLengthToggle.module.css";

interface Props {
    isCollapsed: boolean;
    setIsCollapsed: (isCollapsed: boolean) => void;
    tooltip?: string;
}

/**
 * Component for toggling the visibility of a metadata field
 */
export default function ContentLengthToggle(props: Props) {
    return (
        <Tooltip content={props.tooltip}>
            <Icon
                className={styles.icon}
                iconName={props.isCollapsed ? "ChevronDownSmall" : "ChevronUpSmall"}
                data-testid={props.isCollapsed ? "expand-nested-fields" : "collapse-nested-fields"}
                onClick={() => props.setIsCollapsed(!props.isCollapsed)}
            />
        </Tooltip>
    );
}
