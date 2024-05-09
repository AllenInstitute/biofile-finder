import { PrimaryButton } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useSelector } from "react-redux";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import AnnotationPicker from "../../AnnotationPicker";
import * as modalSelectors from "../selectors";
import { interaction, selection } from "../../../state";

import styles from "./CsvManifest.module.css";

/**
 * Modal overlay for selecting columns to be included in a CSV manifest download of
 * files previously selected.
 */
export default function CsvManifest({ onDismiss }: ModalProps) {
    const annotationsPreviouslySelected = useSelector(
        modalSelectors.getAnnotationsPreviouslySelected
    );
    const [selectedAnnotations, setSelectedAnnotations] = React.useState(
        annotationsPreviouslySelected
    );
    const csvService = useSelector(interaction.selectors.getCsvService);
    const fileSelection = useSelector(selection.selectors.getFileSelection);

    const onDownload = () => {
        const downloadSelection = async () => {
            const selections = fileSelection.toCompactSelectionList();
            const selectedAnnotationNames = selectedAnnotations.map((annotation) => annotation.name);
            const buffer = await csvService.getCsvAsBytes({ annotations: selectedAnnotationNames, selections }, "");

            // Generate a download link (ensure to revoke the object URL after the download).
            // We could use window.showSaveFilePicker() but it is only supported in Chrome.
            const downloadUrl = URL.createObjectURL(new Blob([buffer]));
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = `file-selection-${new Date()}.parquet`;
            a.click();
            URL.revokeObjectURL(downloadUrl);
        }

        downloadSelection();
        onDismiss();
    };

    const body = (
        <>
            <p>Select which annotations you would like included as columns in the downloaded CSV</p>
            <AnnotationPicker
                hasSelectAllCapability
                className={styles.annotationSelector}
                selections={selectedAnnotations}
                setSelections={setSelectedAnnotations}
            />
        </>
    );

    return (
        <BaseModal
            body={body}
            footer={
                <PrimaryButton
                    className={classNames(styles.downloadButton, {
                        [styles.disabled]: !selectedAnnotations.length,
                    })}
                    iconProps={{ iconName: "Download" }}
                    disabled={!selectedAnnotations.length}
                    onClick={onDownload}
                    text="Download"
                />
            }
            onDismiss={onDismiss}
            title="Download CSV Manifest"
        />
    );
}
