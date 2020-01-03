import "normalize.css";
import * as React from "react";
import { useDispatch } from "react-redux";

import AnnotationSidebar from "./containers/AnnotationSidebar";
import Breadcrumbs from "./containers/Breadcrumbs";
import FileDetails from "./containers/FileDetails";
import DirectoryTree from "./containers/DirectoryTree";
import HeaderRibbon from "./containers/HeaderRibbon";
import { metadata } from "./state";

import "./styles/global.css";
const styles = require("./App.module.css");

/**
 * Custom React hook to kick off the process of requesting metadata needed by the application. Only run once, on
 * component mount.
 */
function useApplicationMetadata() {
    const dispatch = useDispatch();
    React.useEffect(() => {
        dispatch(metadata.actions.requestAnnotations());
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

export default function App() {
    useApplicationMetadata();

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
        </div>
    );
}
