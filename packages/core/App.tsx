import "normalize.css";
import { initializeIcons, loadTheme } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import ContextMenu from "./components/ContextMenu";
import CoreContent from "./components/CoreContent/CoreContent";
import FileDetailPanel from "./components/FileDetailPanel";
import Modal from "./components/Modal";
import StatusMessage from "./components/StatusMessage";
import TutorialTooltip from "./components/TutorialTooltip";
import { Environment } from "./constants";
import useCheckForScreenSizeChange from "./hooks/useCheckForScreenSizeChange";
import useCheckForUpdates from "./hooks/useCheckForUpdates";
import useLayoutMeasurements from "./hooks/useLayoutMeasurements";
import useUnsavedDataWarning from "./hooks/useUnsavedDataWarning";
import { interaction, selection } from "./state";

import styles from "./App.module.css";

// Used for mousemove listeners when resizing elements via click and drag (eg. File Details pane)
export const ROOT_ELEMENT_ID = "root";

// initialize @fluentui/react
initializeIcons();
loadTheme({
    defaultFontStyle: {
        fontFamily: "Open Sans, sans-serif",
    },
});

interface AppProps {
    className?: string;
    // E.g.:
    // Localhost: "https://localhost:9081"
    // Stage: "http://stg-aics-api.corp.alleninstitute.org"
    // From the web (behind load balancer): "/"
    environment?: Environment;
}

export default function App(props: AppProps) {
    const { environment = Environment.PRODUCTION } = props;

    const dispatch = useDispatch();
    const shouldDisplaySmallFont = useSelector(selection.selectors.getShouldDisplaySmallFont);

    const [measuredNodeRef, _measuredHeight, measuredWidth] = useLayoutMeasurements<
        HTMLDivElement
    >();

    useCheckForUpdates();
    useUnsavedDataWarning();
    useCheckForScreenSizeChange(measuredWidth);

    // Set data source base urls
    React.useEffect(() => {
        dispatch(
            interaction.actions.initializeApp({
                environment,
            })
        );
    }, [dispatch, environment]);

    return (
        <div
            id={ROOT_ELEMENT_ID}
            className={classNames(styles.root, props.className, {
                [styles.smallFont]: shouldDisplaySmallFont,
            })}
            ref={measuredNodeRef}
        >
            {/* hidden input to capture autofocus on mount */}
            <input className={styles.hidden} autoFocus />
            <div className={styles.coreAndFileDetails}>
                <CoreContent />
                <FileDetailPanel />
            </div>
            <ContextMenu key={useSelector(interaction.selectors.getContextMenuKey)} />
            <StatusMessage />
            <Modal />
            <TutorialTooltip />
        </div>
    );
}
