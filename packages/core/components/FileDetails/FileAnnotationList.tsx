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

    // The path to this file on the host this application is running on
    // may not match the path to this file stored in the database.
    // Determine this local path.
    const [localPath, setLocalPath] = React.useState<string | null>(null);
    React.useEffect(() => {
        let active = true;

        async function formatPathForHost() {
            if (!fileDetails || !active) return;
            const localPath = fileDetails.getFirstAnnotationValue(AnnotationName.LOCAL_FILE_PATH);
            if (!localPath) {
                setLocalPath(null);
                return;
            }
            const formattedPath = await executionEnvService.formatPathForHost(localPath as string);
            if (active) {
                setLocalPath(formattedPath);
            }
        }

        formatPathForHost();

        return () => {
            active = false;
        };
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
                if (fileDetails && fileDetails.downloadInProgress) {
                    annotationValue = "Copying to VAST in progress…";
                    fmsStateIndicator = true;
                } else if (localPath === null) {
                    // localPath hasn't loaded yet or there is no local path annotation
                    return accum;
                } else {
                    // Use the user's /allen mount point, if known
                    annotationValue = localPath;
                }
            }

            if (annotation.name === AnnotationName.FILE_PATH) {
                // Display the full http://... URL
                annotationValue = fileDetails.path;
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
    }, [annotations, fileDetails, isLoading, localPath]);

    return <div className={classNames(styles.list, className)}>{content}</div>;
}
