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
import { Environment } from "./constants";
import { interaction, selection } from "./state";
import useLayoutMeasurements from "./hooks/useLayoutMeasurements";

import styles from "./App.module.css";

// Used for mousemove listeners when resizing elements via click and drag (eg. File Details pane)
export const ROOT_ELEMENT_ID = "root";
// Pixel size; used to alert users that screen is too small for optimal use
const SMALL_SCREEN_BREAKPOINT = 768;

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
    const { environment = Environment.STAGING } = props;

    const dispatch = useDispatch();
    const hasQuerySelected = useSelector(selection.selectors.hasQuerySelected);
    const requiresDataSourceReload = useSelector(selection.selectors.getRequiresDataSourceReload);
    const shouldDisplaySmallFont = useSelector(selection.selectors.getShouldDisplaySmallFont);
    const platformDependentServices = useSelector(
        interaction.selectors.getPlatformDependentServices
    );
    const [measuredNodeRef, _measuredHeight, measuredWidth] = useLayoutMeasurements<
        HTMLDivElement
    >();

    // Check for updates to the application on startup
    React.useEffect(() => {
        const checkForUpdates = async () => {
            try {
                const isUpdateAvailable = await platformDependentServices.applicationInfoService.updateAvailable();
                if (isUpdateAvailable) {
                    const homepage = "https://alleninstitute.github.io/biofile-finder/";
                    const msg = `A new version of the application is available!<br/>
                    Visit the <a href="${homepage}" target="_blank" title="BioFile Finder homepage">BioFile Finder homepage</a> to download.`;
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
        dispatch(
            interaction.actions.initializeApp({
                environment,
            })
        );
    }, [dispatch, environment]);

    // Respond to screen size changes
    React.useEffect(() => {
        // Don't display when hook is still loading
        if (measuredWidth === 0) return;

        // Screen too small, should warn user
        const isSmallScreen = measuredWidth < SMALL_SCREEN_BREAKPOINT;
        dispatch(interaction.actions.setIsSmallScreen(isSmallScreen));
    }, [dispatch, measuredWidth]);

    return (
        <div
            id={ROOT_ELEMENT_ID}
            className={classNames(styles.root, props.className, {
                [styles.smallFont]: shouldDisplaySmallFont,
            })}
            ref={measuredNodeRef}
        >
            <div className={styles.coreAndFileDetails}>
                <div className={styles.querySidebarAndCenter}>
                    <QuerySidebar className={styles.querySidebar} />
                    <div className={styles.center}>
                        {!requiresDataSourceReload &&
                        (hasQuerySelected || window.location.search) ? (
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
