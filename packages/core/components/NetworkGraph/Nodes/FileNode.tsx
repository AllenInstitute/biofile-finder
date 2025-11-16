// prettier-ignore
import { Handle, Position, NodeProps } from '@xyflow/react';
import classNames from "classnames";
import React from "react";

import FileThumbnail from "../../FileThumbnail";
import Tooltip from "../../Tooltip";
import { ProvenanceNode } from "../../../state/provenance/reducer";

import styles from "./FileNode.module.css";

// This is a proof-of-concept example of a custom node
// Note that we are able to apply styling to the node, and can include custom buttons as content
export default function FileNode(props: NodeProps<ProvenanceNode>) {
    return (
        // TODO: Render all of file metadata in nice tooltip here? or is that on click?
        <Tooltip content={props.data.file?.name}>
            <div
                className={classNames(styles.fileNode, {
                    [styles.currentFile]: props?.data?.isSelected,
                })}
            >
                <Handle type="target" position={Position.Top} isConnectable={false} />
                <div className={styles.contentContainer}>
                    <FileThumbnail
                        hideIfEmpty
                        uri={props.data.file?.thumbnail}
                        height={100}
                        width={100}
                    />
                    <div className={styles.fileNodeLabel}>{props.data.file?.name}</div>
                </div>
                <Handle type="source" position={Position.Bottom} isConnectable={false} />
            </div>
        </Tooltip>
    );
}
