// prettier-ignore
import { Handle, Position, NodeProps } from '@xyflow/react';
import React from "react";
import { useDispatch } from "react-redux";

import Tooltip from "../../Tooltip";
import { interaction } from "../../../state";
import { ProvenanceNode } from "../../../state/provenance/reducer";

import styles from "./MetadataNode.module.css";


// This is a proof-of-concept example of a custom node
// Note that we are able to apply styling to the node, and can include custom buttons as content
export default function MetadataNode(props: NodeProps<ProvenanceNode>) {
    const dispatch = useDispatch();

    const onContextMenu = (evt: React.MouseEvent) => {
        evt.preventDefault();
        const items = [
            {
                key: "show-related-files",
                text: "Show files generated via same process",
                title: "Show files generated via same process",
                onClick: () => {
                    // TODO
                },
            },
        ];
        dispatch(interaction.actions.showContextMenu(items, evt.nativeEvent));
    };


    return (
        <Tooltip content={props.data.annotation?.name}>
            <div className={styles.fileNode} onContextMenu={onContextMenu}>
                {/* The handle component is where edges can connect to */}
                <Handle type="target" position={Position.Top} isConnectable={false} />
                <div className={styles.contentContainer}>
                    <div className={styles.fileNodeLabel}>{props.data.annotation?.name}</div>
                    <div className={styles.fileNodeLabel}>{props.data.annotation?.values.join(", ")}</div>
                </div>
                <Handle type="source" position={Position.Bottom} isConnectable={false} />
            </div>
        </Tooltip>
    );
}
