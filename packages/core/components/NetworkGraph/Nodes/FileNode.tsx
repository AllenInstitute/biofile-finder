import { IContextualMenuItem } from "@fluentui/react";
// prettier-ignore
import { Handle, Position, NodeProps } from '@xyflow/react';
import classNames from "classnames";
import React from "react";

import { TertiaryButton } from "../../Buttons";
import Tooltip from "../../Tooltip";
import { ProvenanceNode } from "../../../state/provenance/reducer";

import styles from "./FileNode.module.css";

// This is a proof-of-concept example of a custom node
// Note that we are able to apply styling to the node, and can include custom buttons as content
export default function FileNode(props: NodeProps<ProvenanceNode>) {
    const shareQueryOptions: IContextualMenuItem[] = [
        {
            key: "graph-menu-option-1",
            text: "Placeholder for a filter action",
            iconProps: { iconName: "Filter" },
            onClick: () => {
                console.debug("placeholder");
            },
        },
        {
            key: "graph-menu-option-2",
            text: "Placeholder for opening link to file info",
            iconProps: { iconName: "Link" },
            title: "Open file info in new tab",
            onClick: () => {
                console.debug("placeholder");
            },
        },
    ];

    return (
        <Tooltip content={props.data.file?.name}>
            <div
                className={classNames(styles.fileNode, {
                    [styles.currentFile]: props?.data?.isSelected,
                })}
            >
                {/* The handle component is where edges can connect to */}
                <Handle type="target" position={Position.Top} isConnectable={false} />
                <div className={styles.fileNodeLabel}>{props.data.file?.name}</div>
                {/* <TertiaryButton
                    className={styles.menuButton}
                    iconName="More"
                    menuItems={shareQueryOptions}
                    title=""
                /> */}
                <Handle type="source" position={Position.Bottom} isConnectable={false} />
            </div>
        </Tooltip>
    );
}
