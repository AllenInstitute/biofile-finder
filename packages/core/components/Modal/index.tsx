import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction } from "../../state";
import CsvManifest from "./CsvManifest";
import DatasetForm from "./DatasetForm";
import FileSetForm from "./FileSetForm";
import PythonSnippet from "./PythonSnippet";

export interface ModalProps {
    onDismiss: () => void;
}

export enum ModalType {
    CsvManifest = 1,
    DatasetForm = 2,
    FileSetForm = 3,
    PythonSnippet = 4,
}

/**
 * Modal factory
 */
export default function Modal() {
    const dispatch = useDispatch();
    const visibleModal = useSelector(interaction.selectors.getVisibleModal);

    const onDismiss = () => {
        dispatch(interaction.actions.hideVisibleModal());
    };

    switch (visibleModal) {
        case ModalType.CsvManifest:
            return <CsvManifest onDismiss={onDismiss} />;
        case ModalType.DatasetForm:
            return <DatasetForm onDismiss={onDismiss} />;
        case ModalType.FileSetForm:
            return <FileSetForm onDismiss={onDismiss} />;
        case ModalType.PythonSnippet:
            return <PythonSnippet onDismiss={onDismiss} />;
        default:
            return null;
    }
}
