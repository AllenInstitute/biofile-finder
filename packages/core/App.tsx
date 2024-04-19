import "normalize.css";
import { initializeIcons, loadTheme } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { batch, useDispatch, useSelector } from "react-redux";

import ContextMenu from "./components/ContextMenu";
import Modal from "./components/Modal";
import DirectoryTree from "./components/DirectoryTree";
import FileDetails from "./components/FileDetails";
import StatusMessage from "./components/StatusMessage";
import TutorialTooltip from "./components/TutorialTooltip";
import QuerySidebar from "./components/QuerySidebar";
import { FileExplorerServiceBaseUrl } from "./constants";
import { interaction, metadata, selection } from "./state";
import { PlatformDependentServices } from "./state/interaction/actions";

import "./styles/global.css";
import styles from "./App.module.css";

// Used for mousemove listeners when resizing elements via click and drag (eg. File Details pane)
export const ROOT_ELEMENT_ID = "root";

// initialize @fluentui/react
initializeIcons();
loadTheme({
    defaultFontStyle: {
        fontFamily: "Roboto",
    },
});

interface AppProps {
    // E.g.:
    // Localhost: "https://localhost:9081"
    // Stage: "http://stg-aics-api.corp.alleninstitute.org"
    // From the web (behind load balancer): "/"
    fileExplorerServiceBaseUrl?: string;
    platformDependentServices?: Partial<PlatformDependentServices>;
}

const DEFAULT_PLATFORM_DEPENDENT_SERVICES = Object.freeze({});

export default function App(props: AppProps) {
    const {
        fileExplorerServiceBaseUrl = FileExplorerServiceBaseUrl.PRODUCTION,
        platformDependentServices = DEFAULT_PLATFORM_DEPENDENT_SERVICES,
    } = props;

    const dispatch = useDispatch();
    const isDarkTheme = useSelector(selection.selectors.getIsDarkTheme);
    const shouldDisplaySmallFont = useSelector(selection.selectors.getShouldDisplaySmallFont);

    // Set platform-dependent services in state
    React.useEffect(() => {
        dispatch(interaction.actions.setPlatformDependentServices(platformDependentServices));
    }, [dispatch, platformDependentServices]);

    // Set data source base urls
    // And kick off the process of requesting metadata needed by the application.
    React.useEffect(() => {
        batch(() => {
            dispatch(interaction.actions.setFileExplorerServiceBaseUrl(fileExplorerServiceBaseUrl));
            dispatch(metadata.actions.requestAnnotations());
            dispatch(metadata.actions.requestCollections());
            dispatch(selection.actions.setAnnotationHierarchy([]));
        });
    }, [dispatch, fileExplorerServiceBaseUrl]);

    return (
        <div
            id={ROOT_ELEMENT_ID}
            className={classNames(styles.root, {
                [styles.lightTheme]: !isDarkTheme,
                [styles.smallFont]: shouldDisplaySmallFont,
            })}
        >
            <div className={styles.coreAndFileDetails}>
                <div className={styles.querySidebarAndFileList}>
                    <QuerySidebar className={styles.querySidebar} />
                    <DirectoryTree className={styles.fileList} />
                </div>
                <FileDetails className={styles.fileDetails} />
            </div>
            <ContextMenu key={useSelector(interaction.selectors.getContextMenuKey)} />
            <StatusMessage />
            <Modal />
            <TutorialTooltip />
        </div>
    );
}
