import { Overlay } from "@fluentui/react";
import * as React from "react";
import { useSelector } from "react-redux";

import LoadingIcon from "../Icons/LoadingIcon";
import { interaction } from "../../state";

import styles from "./Overlay.module.css";

export default function LoadingOverlay() {
    const isOverlayVisible = useSelector(interaction.selectors.getIsOverlayVisible);
    const overlayText = useSelector(interaction.selectors.getOverlayText);
    if (!isOverlayVisible) {
        return null;
    }
    return (
        <Overlay isDarkThemed={true} styles={{ root: styles.overlayRoot }}>
            <div>
                {overlayText || "Loading..."}
                <LoadingIcon className={styles.spinner} size={2} />
            </div>
        </Overlay>
    );
}
