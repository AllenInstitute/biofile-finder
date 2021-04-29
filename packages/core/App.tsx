import "normalize.css";
import classNames from "classnames";
import { initializeIcons, loadTheme } from "@fluentui/react";
import * as React from "react";
import { batch, useDispatch, useSelector } from "react-redux";

import AnnotationSidebar from "./components/AnnotationSidebar";
import ContextMenu from "./components/ContextMenu";
import Modal from "./components/Modal";
import DirectoryTree from "./components/DirectoryTree";
import FileDetails from "./components/FileDetails";
import FileExplorerURLBar from "./components/FileExplorerURLBar";
import HeaderRibbon from "./components/HeaderRibbon";
import StatusMessage from "./components/StatusMessage";
import { FileExplorerServiceBaseUrl } from "./constants";
import { interaction, metadata, selection } from "./state";
import { PlatformDependentServices } from "./state/interaction/actions";

import "./styles/global.css";
const styles = require("./App.module.css");

// initialize @fluentui/react
initializeIcons();
loadTheme({
    defaultFontStyle: {
        fontFamily: "Roboto",
    },
});

interface AppProps {
    allenMountPoint?: string;
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
        allenMountPoint,
        fileExplorerServiceBaseUrl = FileExplorerServiceBaseUrl.PRODUCTION,
        platformDependentServices = DEFAULT_PLATFORM_DEPENDENT_SERVICES,
    } = props;

    const dispatch = useDispatch();

    // Set platform-dependent services in state
    React.useEffect(() => {
        dispatch(interaction.actions.setPlatformDependentServices(platformDependentServices));
    }, [dispatch, platformDependentServices]);

    // If the Allen mount point was set using the "Settings" menu pass along the change to app state
    React.useEffect(() => {
        if (allenMountPoint) {
            dispatch(interaction.actions.setAllenMountPoint(allenMountPoint));
        }
    }, [dispatch, allenMountPoint]);

    // Set data source base urls
    // And kick off the process of requesting metadata needed by the application.
    React.useEffect(() => {
        batch(() => {
            dispatch(interaction.actions.setFileExplorerServiceBaseUrl(fileExplorerServiceBaseUrl));
            dispatch(metadata.actions.requestAnnotations());
            dispatch(selection.actions.setAnnotationHierarchy([]));
        });
    }, [dispatch, fileExplorerServiceBaseUrl]);

    return (
        <div className={styles.root}>
            <HeaderRibbon className={classNames(styles.headerRibbon, styles.placeholder)} />
            <div className={styles.everythingExceptHeaderRibbon}>
                <div className={styles.core}>
                    <FileExplorerURLBar className={classNames(styles.urlBar)} />
                    <div className={styles.annotationHierarchyAndFileList}>
                        <AnnotationSidebar className={styles.annotationHierarchy} />
                        <DirectoryTree className={styles.fileList} />
                    </div>
                </div>
                <FileDetails className={styles.fileDetails} />
            </div>
            <ContextMenu key={useSelector(interaction.selectors.getContextMenuKey)} />
            <StatusMessage />
            <Modal />
        </div>
    );
}
