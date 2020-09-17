import * as React from "react";
import { useSelector } from "react-redux";

import { AnnotationName, TOP_LEVEL_FILE_ANNOTATIONS } from "../../constants";
import Annotation from "../../entity/Annotation";
import { AnnotationType } from "../../entity/AnnotationFormatter";
import FileDetail from "../../entity/FileDetail";
import { SavedDataKey } from "../../services/PersistentConfigService";
import { interaction, metadata } from "../../state";
import FileAnnotationRow from "./FileAnnotationRow";

const styles = require("./FileAnnotationList.module.css");

interface FileAnnotationListProps {
    fileDetails?: FileDetail;
    isLoading: boolean;
}

const LOCAL_FILE_PATH_ANNOTATION = new Annotation({
    annotationDisplayName: "File Path (Local)",
    annotationName: AnnotationName.FILE_PATH,
    description: "Path to file in storage on your machine.",
    type: AnnotationType.STRING,
});

/**
 * Component responsible for rendering the metadata pertaining to a file inside the file
 * details pane on right hand side of the application.
 */
export default function FileAnnotationList(props: FileAnnotationListProps) {
    const { fileDetails, isLoading } = props;
    const { persistentConfigService } = useSelector(
        interaction.selectors.getPlatformDependentServices
    );
    const annotations = useSelector(metadata.selectors.getSortedAnnotations);
    const allenMountPoint = persistentConfigService.get(SavedDataKey.AllenMountPoint);

    const content: JSX.Element | JSX.Element[] | null = React.useMemo(() => {
        if (isLoading) {
            return <div>Loading...</div>;
        }

        if (!fileDetails) {
            return null;
        }

        const sorted = Annotation.sort([...TOP_LEVEL_FILE_ANNOTATIONS, ...annotations]);
        return sorted.reduce((accum, annotation) => {
            let values = annotation.extractFromFile(fileDetails.details);
            // If it was found, append it to our list of custom annotation rows
            if (values !== Annotation.MISSING_VALUE) {
                // This annotation is a derivation of the file path annotation
                // where we want to specify the path as would be seen according to the OS & local allen drive
                if (annotation.displayName === LOCAL_FILE_PATH_ANNOTATION.displayName) {
                    // If we don't know the mount point don't include this annotation
                    if (!allenMountPoint) {
                        return accum;
                    }
                    // TODO: improve this replace & make os specific
                    values = allenMountPoint.replace("/allen", "") + "values";
                }
                return [
                    ...accum,
                    <FileAnnotationRow
                        key={annotation.displayName}
                        className={styles.row}
                        name={annotation.displayName}
                        value={values}
                    />,
                ];
            }

            return accum;
        }, [] as JSX.Element[]);
    }, [annotations, fileDetails, isLoading, allenMountPoint]);

    return <div className={styles.list}>{content}</div>;
}
