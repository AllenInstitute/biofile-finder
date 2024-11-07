import * as React from "react";
import { useSelector } from "react-redux";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
// import EditMetadataForm from "../../EditMetadata";
import { selection } from "../../../state";
import FileSelection from "../../../entity/FileSelection";

/**
 * Dialog to display workflow for editing metadata for selected files
 */
export default function EditMetadata({ onDismiss }: ModalProps) {
    const fileSelection = useSelector(
        selection.selectors.getFileSelection,
        FileSelection.selectionsAreEqual
    );
    const totalFilesSelected = fileSelection.count();
    const filesSelectedCountString = `(${totalFilesSelected} file${
        totalFilesSelected === 1 ? "" : "s"
    })`;

    const body = <></>; //<EditMetadataForm />

    return (
        <BaseModal
            body={body}
            onDismiss={onDismiss}
            title={`Edit Metadata ${filesSelectedCountString}`}
        />
    );
}
