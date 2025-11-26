import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

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
    const graph = useSelector(interaction.selectors.getGraph);
    const provenanceRefreshKey = useSelector(interaction.selectors.getProvenanceRefreshKey);

    const [originalOriginName, setOriginalOriginName] = React.useState<string>();
    React.useEffect(() => {
        if (!origin || !originalOriginName) {
            graph.reset();
            setOriginalOriginName(origin?.name);
        }
    }, [graph, origin, originalOriginName, setOriginalOriginName]);

    return (
        <div className={classNames(styles.container, className)}>
            <div className={styles.header}>
                <PrimaryButton
                    iconName="Back"
                    text="Back"
                    onClick={() => dispatch(interaction.actions.setOriginForProvenance(undefined))}
                    title="Close provenance relationship diagram"
                />
                <h2>Provenance for {originalOriginName}</h2>
            </div>
            {origin && (
                <NetworkGraph
                    className={styles.networkGraph}
                    graph={graph}
                    origin={origin}
                    refreshKey={provenanceRefreshKey}
                />
            )}
        </div>
    );
}
