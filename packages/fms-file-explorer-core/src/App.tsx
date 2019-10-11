import "normalize.css";
import * as React from "react";

import AnnotationHierarchy from "./containers/AnnotationHierarchy";
import Breadcrumbs from "./containers/Breadcrumbs";
import FileDetails from "./containers/FileDetails";
import FileList from "./containers/FileList";
import HeaderRibbon from "./containers/HeaderRibbon";

import "./styles/global.css";
const styles = require("./App.module.css");

export default function App() {
    return (
        <div className={styles.root}>
            <HeaderRibbon className={styles.headerRibbon} />
            <div className={styles.everythingExceptHeaderRibbon}>
                <div className={styles.core}>
                    <Breadcrumbs className={styles.breadcrumbs} />
                    <div className={styles.annotationHierarchyAndFileList}>
                        <AnnotationHierarchy className={styles.annotationHierarchy} />
                        <FileList className={styles.fileList} />
                    </div>
                </div>
                <FileDetails className={styles.fileDetails} />
            </div>
        </div>
    );
}
