import { ReactFlowProvider } from "@xyflow/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch } from "react-redux";

import { PrimaryButton } from "../Buttons";
import NetworkGraph from "../NetworkGraph";
import FileDetail from "../../entity/FileDetail";
import { interaction } from "../../state";

import styles from "./RelationshipDiagram.module.css";

interface Props {
    className?: string;
    origin?: FileDetail;
}

/**
 * Overlay for displaying a relationship diagram/graph
 * Should use as much of the screen as possible
 */
export default function RelationshipDiagram({ className, origin }: Props) {
    const dispatch = useDispatch();

    return (
        <div className={classNames(styles.container, className)}>
            <div className={styles.header}>
                <PrimaryButton
                    iconName="Back"
                    text="Back"
                    onClick={() => dispatch(interaction.actions.setOriginForProvenance(undefined))}
                    title="Close provenance relationship diagram"
                />
                <h2>Relationship diagram for {origin?.name}</h2>
            </div>
            {/* The ReactFlow component can only access state (useReactFlow) if it's the child of a ReactFlowProvider
            See https://reactflow.dev/learn/troubleshooting/common-errors#001 */}
            <ReactFlowProvider>
                <NetworkGraph className={styles.networkGraph} />
            </ReactFlowProvider>
        </div>
    );
}
