import * as React from "react";
import { useSelector } from "react-redux";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import NetworkGraph from "../../NetworkGraph";
import { interaction } from "../../../state";

import styles from "./RelationshipDiagram.module.css";

/**
 * Modal overlay for displaying a relationship diagram/graph
 * Should use as much of the screen as possible
 */
export default function RelationshipDiagram({ onDismiss }: ModalProps) {
    const origin = useSelector(interaction.selectors.getOriginForProvenance);

    if (!origin) {
        return null;
    }

    return (
        <BaseModal
            isFullScreen
            body={
                <NetworkGraph
                    className={styles.networkGraphContainer}
                    origin={origin}
                />
            }
            onDismiss={onDismiss}
            title="Test provenance graph"
        />
    );
}
