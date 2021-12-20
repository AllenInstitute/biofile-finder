import classNames from "classnames";
import * as React from "react";
import { useSelector } from "react-redux";

import { AnnotationName, TOP_LEVEL_FILE_ANNOTATIONS } from "../../constants";
import Annotation from "../../entity/Annotation";
import FileDetail from "../../entity/FileDetail";
import { interaction, metadata } from "../../state";
import FileAnnotationRow from "./FileAnnotationRow";

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
    const allenMountPoint = useSelector(interaction.selectors.getAllenMountPoint);
    const { executionEnvService } = useSelector(interaction.selectors.getPlatformDependentServices);

    const content: JSX.Element | JSX.Element[] | null = React.useMemo(() => {
        if (isLoading) {
            return <div>Loading...</div>;
        }

        if (!fileDetails) {
            return null;
        }

        const sorted = Annotation.sort([...TOP_LEVEL_FILE_ANNOTATIONS, ...annotations]);
        return sorted.reduce((accum, annotation) => {
            const values = annotation.extractFromFile(fileDetails.details);
            // If it was found, append it to our list of custom annotation rows
            if (values !== Annotation.MISSING_VALUE) {
                // Derive a more specific file path from the canonical file path
                if (annotation.name === AnnotationName.FILE_PATH && allenMountPoint) {
                    // Use path.normalize() to convert slashes to OS default & remove the would be duplicate
                    // "/allen" from the beginning of the canonical path
                    const localPath = executionEnvService.formatPathForOs(
                        values.substring("/allen".length),
                        allenMountPoint
                    );
                    return [
                        ...accum,
                        <FileAnnotationRow
                            key="file-path-local"
                            className={styles.row}
                            name="File path (Local)"
                            value={localPath}
                        />,
                        <FileAnnotationRow
                            key={annotation.displayName}
                            className={styles.row}
                            name={annotation.displayName}
                            value={values}
                        />,
                    ];
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
    }, [allenMountPoint, annotations, executionEnvService, fileDetails, isLoading]);

    return <div className={classNames(styles.list, className)}>{content}</div>;
}
