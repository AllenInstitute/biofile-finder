import "normalize.css";
import { initializeIcons, loadTheme } from "@fluentui/react";
import classNames from "classnames";
import { uniqueId } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import ContextMenu from "./components/ContextMenu";
import DataSourcePrompt from "./components/DataSourcePrompt";
import Modal from "./components/Modal";
import DirectoryTree from "./components/DirectoryTree";
import FileDetails from "./components/FileDetails";
import GlobalActionButtonRow from "./components/GlobalActionButtonRow";
import StatusMessage from "./components/StatusMessage";
import TutorialTooltip from "./components/TutorialTooltip";
import QuerySidebar from "./components/QuerySidebar";
import { FileExplorerServiceBaseUrl } from "./constants";
import { interaction, selection } from "./state";

import styles from "./App.module.css";

// Used for mousemove listeners when resizing elements via click and drag (eg. File Details pane)
export const ROOT_ELEMENT_ID = "root";

// initialize @fluentui/react
initializeIcons();
loadTheme({
    defaultFontStyle: {
        fontFamily: "Open sans, sans-serif",
    },
});

interface AppProps {
    className?: string;
    // E.g.:
    // Localhost: "https://localhost:9081"
    // Stage: "http://stg-aics-api.corp.alleninstitute.org"
    // From the web (behind load balancer): "/"
    fileExplorerServiceBaseUrl?: string;
}

export default function App(props: AppProps) {
    const { fileExplorerServiceBaseUrl = FileExplorerServiceBaseUrl.PRODUCTION } = props;

    const dispatch = useDispatch();
    const hasQuerySelected = useSelector(selection.selectors.hasQuerySelected);
    const isDarkTheme = useSelector(selection.selectors.getIsDarkTheme);
    const shouldDisplaySmallFont = useSelector(selection.selectors.getShouldDisplaySmallFont);
    const platformDependentServices = useSelector(
        interaction.selectors.getPlatformDependentServices
    );

    // Check for updates to the application on startup
    React.useEffect(() => {
        const checkForUpdates = async () => {
            try {
                const isUpdateAvailable = await platformDependentServices.applicationInfoService.updateAvailable();
                if (isUpdateAvailable) {
                    const homepage = "https://alleninstitute.github.io/aics-fms-file-explorer-app/";
                    const msg = `A new version of the application is available!<br/>
                    Visit the <a href="${homepage}" target="_blank" title="FMS File Explorer homepage">FMS File Explorer homepage</a> to download.`;
                    dispatch(interaction.actions.promptUserToUpdateApp(uniqueId(), msg));
                }
            } catch (e) {
                console.error(
                    "Failed while checking if a newer application version is available",
                    e
                );
            }
        };
        checkForUpdates();
    }, [platformDependentServices, dispatch]);

    // Set data source base urls
    React.useEffect(() => {
        dispatch(interaction.actions.initializeApp(fileExplorerServiceBaseUrl));
    }, [dispatch, fileExplorerServiceBaseUrl]);

    return (
        <div
            id={ROOT_ELEMENT_ID}
            className={classNames(styles.root, props.className, {
                [styles.lightTheme]: !isDarkTheme,
                [styles.smallFont]: shouldDisplaySmallFont,
            })}
        >
            <div className={styles.coreAndFileDetails}>
                <div className={styles.querySidebarAndCenter}>
                    <QuerySidebar className={styles.querySidebar} />
                    <div className={styles.center}>
                        {hasQuerySelected ? (
                            <>
                                <GlobalActionButtonRow className={styles.globalButtonRow} />
                                <DirectoryTree className={styles.fileList} />
                            </>
                        ) : (
                            <DataSourcePrompt className={styles.dataSourcePrompt} />
                        )}
                    </div>
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
