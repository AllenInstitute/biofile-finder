import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import AnnotationPicker from "../../AnnotationPicker";
import { PrimaryButton } from "../../Buttons";
import { interaction, metadata } from "../../../state";

import styles from "./MetadataManifest.module.css";

/**
 * Modal overlay for selecting columns to be included in a metadata manifest download of
 * files previously selected.
 */
export default function MetadataManifest({ onDismiss }: ModalProps) {
    const dispatch = useDispatch();
    const annotations = useSelector(metadata.selectors.getAnnotations);
    const annotationsPreviouslySelected = useSelector(interaction.selectors.getCsvColumns);
    const fileTypeForVisibleModal = useSelector(interaction.selectors.getFileTypeForVisibleModal);

    const [selectedAnnotations, setSelectedAnnotations] = React.useState<string[]>([]);

    // Update the selected annotations when the previously selected annotations
    // or list of all annotations change like on data source change
    React.useEffect(() => {
        const annotationsPreviouslySelectedAvailable = (
            annotationsPreviouslySelected || []
        ).filter((annotationName) =>
            annotations.some((annotation) => annotationName === annotation.name)
        );
        setSelectedAnnotations(annotationsPreviouslySelectedAvailable);
    }, [annotations, annotationsPreviouslySelected]);

    const onDownload = () => {
        dispatch(
            interaction.actions.downloadManifest(selectedAnnotations, fileTypeForVisibleModal)
        );
        onDismiss();
    };

    const body = (
        <div className={styles.bodyContainer}>
            <p>
                Select which annotations you would like included as columns in the downloaded file
            </p>
            <AnnotationPicker
                hasSelectAllCapability
                selections={selectedAnnotations}
                setSelections={setSelectedAnnotations}
                className={styles.listPicker}
            />
        </div>
    );

    return (
        <BaseModal
            body={body}
            footer={
                <div className={styles.footerButtons}>
                    <PrimaryButton
                        className={styles.downloadButton}
                        disabled={!selectedAnnotations.length}
                        iconName="Download"
                        onClick={onDownload}
                        text="DOWNLOAD"
                        title="Download"
                    />
                </div>
            }
            onDismiss={onDismiss}
            title="Download metadata manifest"
        />
    );
}
