import { Overlay } from "@fluentui/react";
import * as React from "react";
import { useSelector } from "react-redux";

import LoadingIcon from "../Icons/LoadingIcon";
import { interaction } from "../../state";

import styles from "./Overlay.module.css";

export default function BaseOverlay() {
    const isOverlayVisible = useSelector(interaction.selectors.getIsOverlayVisible);
    const overlayText = useSelector(interaction.selectors.getOverlayText);
    return (
        <>
            {isOverlayVisible && (
                <Overlay isDarkThemed={true} styles={{ root: styles.overlayRoot }}>
                    <div>
                        {overlayText}
                        <LoadingIcon className={styles.spinner} size={2} />
                    </div>
                </Overlay>
            )}
        </>
    );
}
