import * as React from "react";
import { useSelector } from "react-redux";

import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../constants";
import Annotation from "../../entity/Annotation";
import FileDetail from "../../entity/FileDetail";
import metadata from "../../state/metadata";
import FileAnnotationRow from "./FileAnnotationRow";

const styles = require("./FileAnnotationList.module.css");

interface FileAnnotationListProps {
    fileDetails: FileDetail | null;
    isLoading: boolean;
}

/**
 * Component responsible for rendering the metadata pertaining to a file inside the file
 * details pane on right hand side of the application.
 */
export default function FileAnnotationList(props: FileAnnotationListProps) {
    const { fileDetails, isLoading } = props;
    const annotations = useSelector(metadata.selectors.getSortedAnnotations);

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
    }, [annotations, fileDetails, isLoading]);

    return <div className={styles.list}>{content}</div>;
}
