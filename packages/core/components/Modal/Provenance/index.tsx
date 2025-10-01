import * as React from "react";
import { useSelector } from "react-redux";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import NetworkGraph from "../../NetworkGraph";
import { provenance } from "../../../state";

import styles from "./Provenance.module.css";

/**
 * Modal overlay for selecting columns to be included in a metadata manifest download of
 * files previously selected.
 */
export default function Provenance({ onDismiss }: ModalProps) {
    const nodes = useSelector(provenance.selectors.getNodesForModal);
    const edges = useSelector(provenance.selectors.getEdgesForModal);

    const body = (
        <div className={styles.networkGraphContainer}>
            <NetworkGraph initialNodes={nodes} initialEdges={edges} />
        </div>
    );

    return (
        <BaseModal body={body} onDismiss={onDismiss} title="Test provenance graph" isFullScreen />
    );
}
