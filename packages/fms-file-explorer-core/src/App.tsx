import "normalize.css";
import classNames from "classnames";
import { uniqueId } from "lodash";
import { initializeIcons, loadTheme } from "office-ui-fabric-react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { DataSource } from "./constants";
import AnnotationSidebar from "./containers/AnnotationSidebar";
import ContextMenu from "./containers/ContextMenu";
import DirectoryTree from "./containers/DirectoryTree";
import FileDetails from "./containers/FileDetails";
import FileExplorerURLBar from "./containers/FileExplorerURLBar";
import HeaderRibbon from "./containers/HeaderRibbon";
import ManifestDownloadDialog from "./containers/ManifestDownloadDialog";
import PythonSnippetDialog from "./containers/PythonSnippetDialog";
import StatusMessage from "./containers/StatusMessage";
import ApplicationInfoServiceNoop from "./services/ApplicationInfoService/ApplicationInfoServiceNoop";
import ExecutionEnvServiceNoop from "./services/ExecutionEnvService/ExecutionEnvServiceNoop";
import FileDownloadServiceNoop from "./services/FileDownloadService/FileDownloadServiceNoop";
import FileViewerServiceNoop from "./services/FileViewerService/FileViewerServiceNoop";
import PersistentConfigServiceNoop from "./services/PersistentConfigService/PersistentConfigServiceNoop";
import { interaction, metadata } from "./state";
import { PlatformDependentServices } from "./state/interaction/actions";

import "./styles/global.css";
const styles = require("./App.module.css");

// initialize office-ui-fabric-react
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
    platformDependentServices: {
        applicationInfoService: new ApplicationInfoServiceNoop(),
        fileDownloadService: new FileDownloadServiceNoop(),
        fileViewerService: new FileViewerServiceNoop(),
        executionEnvService: new ExecutionEnvServiceNoop(),
        persistentConfigService: new PersistentConfigServiceNoop(),
    },
};

export default function App(props: AppProps) {
    const {
        allenMountPoint,
        imageJExecutable,
        fileExplorerServiceBaseUrl = defaultProps.fileExplorerServiceBaseUrl,
    } = props;

    const dispatch = useDispatch();

    // Set platform-dependent services in state
    React.useEffect(() => {
        // Substitute default platform dependent services for any not supplied
        const platformDependentServices = props.platformDependentServices
            ? {
                  ...defaultProps.platformDependentServices,
                  ...props.platformDependentServices,
              }
            : defaultProps.platformDependentServices;

        dispatch(interaction.actions.setPlatformDependentServices(platformDependentServices));

        async function checkForUpdates() {
            try {
                if (await platformDependentServices.applicationInfoService.updateAvailable()) {
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
        }

        checkForUpdates();

        async function setApplicationVersion() {
            const applicationVersion = await platformDependentServices.applicationInfoService.getApplicationVersion();
            dispatch(interaction.actions.setApplicationVersion(applicationVersion));
        }

        setApplicationVersion();
    }, [dispatch, props.platformDependentServices]);

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
            <ManifestDownloadDialog />
            <PythonSnippetDialog />
        </div>
    );
}
