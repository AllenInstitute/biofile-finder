import { PrimaryButton } from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { DialogModalProps } from "..";
import BaseModal from "../BaseModal";
import { interaction, metadata } from "../../../state";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../../constants";
import AnnotationSelector from "../../../components/AnnotationSelector";

const TOP_LEVEL_FILE_ANNOTATION_SET = new Set(TOP_LEVEL_FILE_ANNOTATIONS.map((a) => a.displayName));

/**
 * Modal overlay for selecting columns to be included in a CSV manifest download of
 * files previously selected.
 */
export default function CsvManifest({ onDismiss }: DialogModalProps) {
    const dispatch = useDispatch();
    const customAnnotations = useSelector(metadata.selectors.getSortedAnnotations);
    const columnsSavedFromLastTime = useSelector(interaction.selectors.getCsvColumns);

    const defaultAnnotations = columnsSavedFromLastTime
        ? columnsSavedFromLastTime
        : [...TOP_LEVEL_FILE_ANNOTATION_SET];
    const [columns, setColumns] = React.useState<string[]>(defaultAnnotations);

    const [annotations, annotationNames] = React.useMemo(() => {
        const annotations = [...TOP_LEVEL_FILE_ANNOTATIONS, ...customAnnotations];
        const annotationNames = annotations.map((a) => a.displayName);
        return [annotations, annotationNames];
    }, [customAnnotations]);

    const onDownload = () => {
        onDismiss();
        dispatch(interaction.actions.setCsvColumns(columns));
        const columnSet = new Set(columns);
        // Map the annotations to their names (as opposed to their display names)
        // Top level file attributes as of the moment are automatically included
        const columnAnnotations = annotations
            .filter((a) => columnSet.has(a.displayName))
            .map((a) => a.name);

        dispatch(interaction.actions.downloadManifest(columnAnnotations));
    };

    const body = (
        <>
            <p>Select which annotations you would like included as columns in the downloaded CSV</p>
            <AnnotationSelector
                annotations={columns}
                annotationOptions={annotationNames}
                setAnnotations={setColumns}
            />
        </>
    );

    return (
        <BaseModal
            body={body}
            footer={
                <PrimaryButton disabled={!columns.length} onClick={onDownload} text="Download" />
            }
            onDismiss={onDismiss}
            title="Download CSV Manifest"
        />
    );
}
