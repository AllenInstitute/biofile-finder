import { orderBy } from "lodash";
import * as React from "react";

import Annotation from "../../entity/Annotation";
import FileDetail from "../../entity/FileDetail";
import FileAnnotationRow from "./FileAnnotationRow";

const styles = require("./FileAnnotationList.module.css");

interface FileAnnotationListProps {
    allAnnotations: Annotation[];
    fileDetails?: FileDetail;
    isLoading: boolean;
}

/**
 * Component responsible for rendering the metadata pertaining to a file inside the file
 * details pane on right hand side of the application.
 */
export default function FileAnnotationList(props: FileAnnotationListProps) {
    const { allAnnotations, fileDetails, isLoading } = props;

    if (isLoading) {
        return <div className={styles.emptyDetailList}>Loading...</div>;
    }

    if (!fileDetails) {
        return <div className={styles.emptyDetailList}>No files currently selected</div>;
    }

    // Create annotation rows for each annotation that we have a value for (ordered by display name)
    const customAnnotationRows: JSX.Element[] = [];
    orderBy(allAnnotations, ["displayName"]).forEach((anno) => {
        const values = anno.extractFromFile(fileDetails.details);
        // If it was found, append it to our list of custom annotation rows
        if (values !== Annotation.MISSING_VALUE) {
            customAnnotationRows.push(<FileAnnotationRow key={anno.displayName} value={values} />);
        }
    });

    return (
        <div className={styles.listParent}>
            <FileAnnotationRow key="File Name" value={fileDetails.name} />
            <FileAnnotationRow key="File ID" value={fileDetails.id} />
            <FileAnnotationRow key="File Type" value={fileDetails.type} />
            <FileAnnotationRow key="File Path" value={fileDetails.path} />
            {fileDetails.thumbnail && (
                <FileAnnotationRow key="Thumbnail Path" value={fileDetails.thumbnail} />
            )}
            {customAnnotationRows}
        </div>
    );
}
