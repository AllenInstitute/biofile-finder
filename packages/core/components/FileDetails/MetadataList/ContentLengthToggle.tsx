import { Icon } from "@fluentui/react";
import * as React from "react";

import Tooltip from "../../Tooltip";

import styles from "./ContentLengthToggle.module.css";

interface Props {
    isExpanded: boolean;
    setIsExpanded: (isExpanded: boolean) => void;
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
                iconName={props.isExpanded ? "ChevronUpSmall" : "ChevronDownSmall"}
                data-testid={props.isExpanded ? "collapse-nested-fields" : "expand-nested-fields"}
                onClick={() => props.setIsExpanded(!props.isExpanded)}
            />
        </Tooltip>
    );
}
