import { DefaultButton } from '@fluentui/react';
// prettier-ignore
import { Handle, Position, NodeProps } from '@xyflow/react';
import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { useButtonMenu } from '../../Buttons';
import Tooltip from "../../Tooltip";
import { ProvenanceNode } from '../../../entity/GraphGenerator';
import { interaction } from "../../../state";

import styles from "./MetadataNode.module.css";


const clipLabel = (label?: string) => {
    if (label && label.length > 15) {
        return label.slice(0, 11) + "...";
    }
    return label;
};

// This is a proof-of-concept example of a custom node
// Note that we are able to apply styling to the node, and can include custom buttons as content
export default function MetadataNode(props: NodeProps<ProvenanceNode>) {
    const dispatch = useDispatch();
    const origin = useSelector(interaction.selectors.getOriginForProvenance);
    const graphHasMoreToSearch = useSelector(interaction.selectors.getGraphHasMoreToSearch);

    const buttonMenu = useButtonMenu({
        items: [
            {
                key: "check-for-more-relationships",
                text: "Check for more relationships",
                title: graphHasMoreToSearch ? undefined : "All relationships have been checked",
                disabled: !graphHasMoreToSearch,
                onClick: () => {
                    dispatch(interaction.actions.setOriginForProvenance(origin));
                }
            },
        ],
    });

    const annotationValues = props.data.annotation?.values.join(", ");
    const tooltip = `${props.data.annotation?.name}: ${annotationValues}`;
    return (
        <Tooltip content={tooltip}>
<           DefaultButton
                className={styles.node}
                menuProps={buttonMenu}
            >
                <Handle
                    className={styles.handle}
                    type="target"
                    isConnectable={false}
                    position={Position.Top}
                />
                <div className={styles.contentContainer}>
                    <div className={styles.label}>{clipLabel(props.data.annotation?.name)}</div>
                    <div className={styles.label}>{clipLabel(annotationValues)}</div>
                </div>
                <Handle
                    className={styles.handle}
                    type="source"
                    isConnectable={false}
                    position={Position.Bottom}
                />
            </DefaultButton>
        </Tooltip>
    );
}
