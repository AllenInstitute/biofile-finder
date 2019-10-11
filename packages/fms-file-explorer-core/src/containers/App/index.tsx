import * as React from "react";

import AnnotationHierarchy from "../AnnotationHierarchy";
import Breadcrumbs from "../Breadcrumbs";
import FileDetails from "../FileDetails";
import FileList from "../FileList";
import HeaderRibbon from "../HeaderRibbon";

const styles = require("./style.module.css");

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
