import "normalize.css";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import AnnotationSidebar from "./containers/AnnotationSidebar";
import Breadcrumbs from "./containers/Breadcrumbs";
import ContextMenu from "./containers/ContextMenu";
import DirectoryTree from "./containers/DirectoryTree";
import * as directoryTreeSelectors from "./containers/DirectoryTree/selectors";
import FileDetails from "./containers/FileDetails";
import HeaderRibbon from "./containers/HeaderRibbon";
import { interaction, metadata } from "./state";

import "./styles/global.css";
const styles = require("./App.module.css");

interface AppProps {
    // E.g.:
    // Localhost: "https://localhost:9081"
    // Stage: "http://stg-aics-api.corp.alleninstitute.org"
    // From the web (behind load balancer): "/"
    fileExplorerServiceBaseUrl?: string;
}

export default function App(props: AppProps) {
    const { fileExplorerServiceBaseUrl } = props;

    const dispatch = useDispatch();

    // Set connection configuration for the file-explorer-service
    // And kick off the process of requesting metadata needed by the application.
    React.useEffect(() => {
        if (fileExplorerServiceBaseUrl) {
            dispatch(interaction.actions.setFileExplorerServiceBaseUrl(fileExplorerServiceBaseUrl));
        }

        dispatch(metadata.actions.requestAnnotations());
    }, [dispatch, fileExplorerServiceBaseUrl]);

    const fileFilters = useSelector(directoryTreeSelectors.getFileFilters);
    const fileService = useSelector(directoryTreeSelectors.getFileService);
    const directoryTreeKey = useSelector(directoryTreeSelectors.getDirectoryTreeComponentKey);

    return (
        <div className={styles.root}>
            <HeaderRibbon className={styles.headerRibbon} />
            <div className={styles.everythingExceptHeaderRibbon}>
                <div className={styles.core}>
                    <Breadcrumbs className={styles.breadcrumbs} />
                    <div className={styles.annotationHierarchyAndFileList}>
                        <AnnotationSidebar className={styles.annotationHierarchy} />
                        <DirectoryTree
                            className={styles.fileList}
                            fileService={fileService}
                            hierarchyFilters={fileFilters}
                            key={directoryTreeKey}
                        />
                    </div>
                </div>
                <FileDetails className={styles.fileDetails} />
            </div>
            <ContextMenu key={useSelector(interaction.selectors.getContextMenuKey)} />
        </div>
    );
}
