import "normalize.css";
import classNames from "classnames";
import { uniqueId } from "lodash";
import { initializeIcons, loadTheme } from "office-ui-fabric-react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { DataSource } from "./constants";
import AnnotationSidebar from "./containers/AnnotationSidebar";
import Breadcrumbs from "./containers/Breadcrumbs";
import ContextMenu from "./containers/ContextMenu";
import DirectoryTree from "./containers/DirectoryTree";
import FileDetails from "./containers/FileDetails";
import HeaderRibbon from "./containers/HeaderRibbon";
import ManifestDownloadDialog from "./containers/ManifestDownloadDialog";
import StatusMessage from "./containers/StatusMessage";
import ApplicationInfoServiceNoop from "./services/ApplicationInfoService/ApplicationInfoServiceNoop";
import FileDownloadServiceNoop from "./services/FileDownloadService/FileDownloadServiceNoop";
import PersistentConfigServiceDefault from "./services/PersistentConfigService/PersistentConfigServiceDefault";
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
        persistentConfigService: new PersistentConfigServiceDefault(),
    },
};

export default function App(props: AppProps) {
    const { fileExplorerServiceBaseUrl = defaultProps.fileExplorerServiceBaseUrl } = props;
    const platformDependentServices = props.platformDependentServices
        ? {
              ...defaultProps.platformDependentServices,
              ...props.platformDependentServices,
          }
        : defaultProps.platformDependentServices;

    const dispatch = useDispatch();

    // Set platform-dependent services in state
    React.useEffect(() => {
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
    }, [dispatch, platformDependentServices]);

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
                    <Breadcrumbs className={classNames(styles.breadcrumbs, styles.placeholder)} />
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
        </div>
    );
}
