import classNames from "classnames";
import * as React from "react";
import { useSelector } from "react-redux";

import FileAnnotationRow from "./FileAnnotationRow";
import Annotation from "../../entity/Annotation";
import AnnotationName from "../../entity/Annotation/AnnotationName";
import FileDetail from "../../entity/FileDetail";
import { interaction, metadata } from "../../state";

import styles from "./FileAnnotationList.module.css";

interface FileAnnotationListProps {
    className?: string;
    fileDetails: FileDetail | null;
    isLoading: boolean;
}

/**
 * Component responsible for rendering the metadata pertaining to a file inside the file
 * details pane on right hand side of the application.
 */
export default function FileAnnotationList(props: FileAnnotationListProps) {
    const { className, fileDetails, isLoading } = props;
    const annotations = useSelector(metadata.selectors.getSortedAnnotations);
    const { executionEnvService } = useSelector(interaction.selectors.getPlatformDependentServices);

    // Format path for mounted users
    const [formattedLocalPath, setFormattedLocalPath] = React.useState<string | null>(null);
    React.useEffect(() => {
        async function formatLocalPath() {
            const local = fileDetails?.localPath?.trim();
            if (!local) {
                setFormattedLocalPath(null);
                return;
            }
            const formatted = await executionEnvService.formatPathForHost(local);
            setFormattedLocalPath(formatted);
        }
        formatLocalPath();
    }, [fileDetails, executionEnvService]);

    const content: JSX.Element | JSX.Element[] | null = React.useMemo(() => {
        if (isLoading) {
            return <div>Loading...</div>;
        }

        if (!fileDetails) {
            return null;
        }

        return annotations.reduce((accum, annotation) => {
            if (annotation.displayName === "File Name") {
                return accum;
            }

            let annotationValue = annotation.extractFromFile(fileDetails);
            let fmsStateIndicator = false;

            if (annotation.name === AnnotationName.LOCAL_FILE_PATH) {
                if (fileDetails.downloadInProgress) {
                    annotationValue = fileDetails.localPath || Annotation.MISSING_VALUE;
                    fmsStateIndicator = true;
                } else {
                    annotationValue = formattedLocalPath || Annotation.MISSING_VALUE;
                }
            }

            if (annotation.name === AnnotationName.FILE_PATH) {
                // Display the full http://... URL
                annotationValue = fileDetails.cloudPath;
            }

            if (annotationValue === Annotation.MISSING_VALUE) {
                // Nothing to show for this annotation -- skip
                return accum;
            }

            return [
                ...accum,
                <FileAnnotationRow
                    key={annotation.displayName}
                    className={styles.row}
                    name={annotation.displayName}
                    value={annotationValue}
                    fmsStateIndicator={fmsStateIndicator}
                />,
            ];
        }, [] as JSX.Element[]);
    }, [annotations, fileDetails, formattedLocalPath, isLoading]);

    return <div className={classNames(styles.list, className)}>{content}</div>;
}
