import { PrimaryButton } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import AnnotationPicker from "../../AnnotationPicker";
import { interaction } from "../../../state";

import styles from "./MetadataManifest.module.css";

/**
 * Modal overlay for selecting columns to be included in a metadata manifest download of
 * files previously selected.
 */
export default function MetadataManifest({ onDismiss }: ModalProps) {
    const dispatch = useDispatch();
    const annotationsPreviouslySelected = useSelector(interaction.selectors.getCsvColumns);
    const [selectedAnnotations, setSelectedAnnotations] = React.useState(
        annotationsPreviouslySelected || []
    );
    const fileTypeForVisibleModal = useSelector(interaction.selectors.getFileTypeForVisibleModal);

    const onDownload = () => {
        dispatch(
            interaction.actions.downloadManifest(selectedAnnotations, fileTypeForVisibleModal)
        );
        onDismiss();
    };

    const body = (
        <>
            <p>
                Select which annotations you would like included as columns in the downloaded file
            </p>
            <AnnotationPicker
                hasSelectAllCapability
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
            title="Download metadata manifest"
        />
    );
}
