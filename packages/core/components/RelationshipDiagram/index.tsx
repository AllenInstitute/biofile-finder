import { Panel, PanelType } from "@fluentui/react";
import * as React from "react";
import { useSelector } from "react-redux";

import { PrimaryButton } from "../Buttons";
import NetworkGraph from "../NetworkGraph";
import { interaction, selection } from "../../state";

import styles from "./RelationshipDiagram.module.css";

/**
 * Modal overlay for displaying a relationship diagram/graph
 * Should use as much of the screen as possible
 */
export default function RelationshipDiagram() {
    const origin = useSelector(interaction.selectors.getOriginForProvenance);

    const [originalOriginName, setOriginalOriginName] = React.useState<string>();
    React.useEffect(() => {
        if (!origin || !originalOriginName) {
            setOriginalOriginName(origin?.name);
        }
    }, [origin, originalOriginName, setOriginalOriginName]);

    return (
        <Panel
            className={styles.panel}
            isOpen={!!origin}
            hasCloseButton={false}
            type={PanelType.smallFluid}
            styles={{
                root: {
                    top: "60px"
                }
            }}
        >
            {!!origin && (
                <>
                    <div className={styles.header}>
                        {/* TODO: unfocus this */}
                        <PrimaryButton
                            iconName="Back"
                            text="Back"
                            onClick={() => interaction.actions.setOriginForProvenance()}
                            title="Close provenance relationship diagram"
                        />
                        <h4>Provenance for {originalOriginName}</h4>
                    </div>
                    <NetworkGraph
                        className={styles.networkGraph}
                        origin={origin}
                    />
                </>
            )}
        </Panel>
    );
}
