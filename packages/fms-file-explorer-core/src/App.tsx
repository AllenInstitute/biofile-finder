import "normalize.css";
import classNames from "classnames";
import { initializeIcons, loadTheme } from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { DataSource } from "./constants";
import AnnotationSidebar from "./containers/AnnotationSidebar";
import ContextMenu from "./containers/ContextMenu";
import Modal from "./containers/Modal";
import DirectoryTree from "./containers/DirectoryTree";
import FileDetails from "./containers/FileDetails";
import FileExplorerURLBar from "./containers/FileExplorerURLBar";
import HeaderRibbon from "./containers/HeaderRibbon";
import StatusMessage from "./containers/StatusMessage";
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
    imageJExecutable?: string;
    // E.g.:
    // Localhost: "https://localhost:9081"
    // Stage: "http://stg-aics-api.corp.alleninstitute.org"
    // From the web (behind load balancer): "/"
    fileExplorerServiceBaseUrl?: string;
    platformDependentServices?: Partial<PlatformDependentServices>;
}

const defaultProps = {
    fileExplorerServiceBaseUrl: DataSource.PRODUCTION,
    platformDependentServices: {},
};

export default function App(props: AppProps) {
    const {
        allenMountPoint,
        imageJExecutable,
        fileExplorerServiceBaseUrl = defaultProps.fileExplorerServiceBaseUrl,
        platformDependentServices = defaultProps.platformDependentServices,
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

    // If the ImageJ/Fiji executable location was set using the "Settings" menu pass along the change to app state
    React.useEffect(() => {
        if (imageJExecutable) {
            dispatch(interaction.actions.setImageJLocation(imageJExecutable));
        }
    }, [dispatch, imageJExecutable]);

    // Set connection configuration for the file-explorer-service
    // And kick off the process of requesting metadata needed by the application.
    React.useEffect(() => {
        dispatch(interaction.actions.setFileExplorerServiceBaseUrl(fileExplorerServiceBaseUrl));
        dispatch(metadata.actions.requestAnnotations());
        dispatch(selection.actions.setAnnotationHierarchy([]));
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
