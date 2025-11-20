import { Panel, PanelType } from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { PrimaryButton } from "../Buttons";
import NetworkGraph from "../NetworkGraph";
import { interaction } from "../../state";

import styles from "./RelationshipDiagram.module.css";

/**
 * Overlay for displaying a relationship diagram/graph
 * Should use as much of the screen as possible
 */
export default function RelationshipDiagram() {
    const dispatch = useDispatch();
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
            focusTrapZoneProps={{
                disableFirstFocus: true,
                elementToFocusOnDismiss: undefined,
                focusPreviouslyFocusedInnerElement: false,
                ignoreExternalFocusing: true
            }}
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
                        <PrimaryButton
                            iconName="Back"
                            text="Back"
                            onClick={() => dispatch(interaction.actions.setOriginForProvenance(undefined))}
                            title="Close provenance relationship diagram"
                        />
                        <h2>Provenance for {originalOriginName}</h2>
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
