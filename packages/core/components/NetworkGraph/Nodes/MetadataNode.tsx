import { DefaultButton } from "@fluentui/react";
// prettier-ignore
import { Handle, Position, NodeProps } from '@xyflow/react';
import React from "react";
import { useDispatch, useSelector } from "react-redux";

import nodeMenuItems from "./nodeMenuItems";
import { useButtonMenu } from "../../Buttons";
import Tooltip from "../../Tooltip";
import {
    FileNode as FileNodeType,
    MetadataNode as MetadataNodeType,
    getGridPosition,
} from "../../../entity/Graph";
import { interaction } from "../../../state";

import styles from "./MetadataNode.module.css";

// TODO: Remove this and use CSS
const clipLabel = (label?: string) => {
    if (label && label.length > 15) {
        return label.slice(0, 11) + "...";
    }
    return label;
};

// This is a proof-of-concept example of a custom node
// Note that we are able to apply styling to the node, and can include custom buttons as content
export default function MetadataNode(props: NodeProps<FileNodeType | MetadataNodeType>) {
    const dispatch = useDispatch();
    const graph = useSelector(interaction.selectors.getGraph);
    const origin = useSelector(interaction.selectors.getOriginForProvenance);

    const canOrganizeAsGrid = React.useMemo(() => {
        const child = graph.getChildren(props.id)[0];
        return !!getGridPosition(child);
    }, [graph, props.id, props.data]);

    const buttonMenu = useButtonMenu({
        items: nodeMenuItems(dispatch, graph, props.id, origin, canOrganizeAsGrid),
    });

    const annotationValues = props.data.annotation?.values.join(", ");
    const tooltip = `${props.data.annotation?.name}: ${annotationValues}`;
    return (
        <Tooltip content={tooltip}>
            <DefaultButton className={styles.node} menuProps={buttonMenu}>
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
