import { IconButton, IContextualMenuProps } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import Tooltip from "../Tooltip";

import styles from "./TransparentIconButton.module.css";

interface Props {
    className?: string;
    disabled?: boolean;
    iconName: string;
    id?: string; // For testing purposes
    label?: string;
    menuProps?: IContextualMenuProps;
    onClick?: () => void;
    title?: string;
}

/**
 * Stylized icon buttons with transparent backgrounds (e.g., close and edit interactions)
 */
export default function TransparentIconButton(props: Props) {
    return (
        <Tooltip content={props?.title || ""}>
            <IconButton
                ariaDescription={props?.title}
                ariaLabel={props?.label || props.iconName}
                className={classNames(styles.iconButton, props?.className)}
                disabled={props?.disabled}
                onClick={props?.onClick}
                iconProps={{ iconName: props.iconName }}
                data-testid={props?.id}
                menuProps={props?.menuProps}
            />
        </Tooltip>
    );
}
