import "normalize.css";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import AnnotationSidebar from "./containers/AnnotationSidebar";
import Breadcrumbs from "./containers/Breadcrumbs";
import ContextMenu from "./containers/ContextMenu";
import DirectoryTree from "./containers/DirectoryTree";
import FileDetails from "./containers/FileDetails";
import HeaderRibbon from "./containers/HeaderRibbon";
import { interaction, metadata } from "./state";

import "./styles/global.css";
const styles = require("./App.module.css");

interface AppProps {
    fileExplorerServiceHost?: string;
    fileExplorerServicePort?: number;
    fileExplorerServiceProtocol?: string;
}

export default function App(props: AppProps) {
    const { fileExplorerServiceHost, fileExplorerServicePort, fileExplorerServiceProtocol } = props;

    const dispatch = useDispatch();

    // Kick off the process of requesting metadata needed by the application.
    // Only run once, on component mount.
    React.useEffect(() => {
        dispatch(metadata.actions.requestAnnotations());
    }, [dispatch]);

    // Set connection configuration for the file-explorer-service
    React.useEffect(() => {
        dispatch(
            interaction.actions.setFileExplorerServiceConnectionConfig({
                host: fileExplorerServiceHost,
                port: fileExplorerServicePort,
                protocol: fileExplorerServiceProtocol,
            })
        );
    }, [dispatch, fileExplorerServiceHost, fileExplorerServicePort, fileExplorerServiceProtocol]);

    return (
        <div className={styles.root}>
            <HeaderRibbon className={styles.headerRibbon} />
            <div className={styles.everythingExceptHeaderRibbon}>
                <div className={styles.core}>
                    <Breadcrumbs className={styles.breadcrumbs} />
                    <div className={styles.annotationHierarchyAndFileList}>
                        <AnnotationSidebar className={styles.annotationHierarchy} />
                        <DirectoryTree className={styles.fileList} />
                    </div>
                </div>
                <FileDetails className={styles.fileDetails} />
            </div>
            <ContextMenu key={useSelector(interaction.selectors.getContextMenuKey)} />
        </div>
    );
}
