import { PrimaryButton } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useSelector } from "react-redux";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import AnnotationPicker from "../../AnnotationPicker";
import * as modalSelectors from "../selectors";
import { interaction, selection } from "../../../state";

import styles from "./MetadataManifest.module.css";


const downloadOnBrowser = (name: string, data: Uint8Array) => {
    const downloadUrl = URL.createObjectURL(new Blob([data]));
    try {
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = name;
        a.click();
        a.remove();
    } catch (err) {
        console.error(`Failed to download file: ${err}`);
        throw err;
    } finally {
        URL.revokeObjectURL(downloadUrl);
    }
}

const downloadOnDesktop = (name: string, data: Uint8Array) => {

};

/**
 * Modal overlay for selecting columns to be included in a metadata manifest download of
 * files previously selected.
 */
export default function MetadataManifest({ onDismiss }: ModalProps) {
    const annotationsPreviouslySelected = useSelector(
        modalSelectors.getAnnotationsPreviouslySelected
    );
    const [selectedAnnotations, setSelectedAnnotations] = React.useState(
        annotationsPreviouslySelected
    );
    const fileService = useSelector(interaction.selectors.getFileService);
    const fileSelection = useSelector(selection.selectors.getFileSelection);
    const fileTypeForVisibleModal = useSelector(interaction.selectors.getFileTypeForVisibleModal);

    const onDownload = () => {
        const downloadSelection = async () => {
            const selections = fileSelection.toCompactSelectionList();
            const selectedAnnotationNames = selectedAnnotations.map((annotation) => annotation.name);
            const buffer = await fileService.getFilesAsBuffer(selectedAnnotationNames, selections, fileTypeForVisibleModal);
            console.log("buffer is", buffer);
            downloadOnBrowser(`file-selection-${new Date()}.${fileTypeForVisibleModal}`, buffer);
        }

        downloadSelection();
        onDismiss();
    };

    const body = (
        <>
            <p>Select which annotations you would like included as columns in the downloaded file</p>
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
            title="Download Metadata Manifest"
        />
    );
}
