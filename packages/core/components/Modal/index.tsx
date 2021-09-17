import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction } from "../../state";
import CsvManifest from "./CsvManifest";
import PythonSnippet from "./PythonSnippet";
import DatasetForm from "./DatasetForm";

export interface ModalProps {
    onDismiss: () => void;
}

export enum ModalType {
    CsvManifest = 1,
    PythonSnippet = 2,
    DatasetForm = 3,
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
        case ModalType.PythonSnippet:
            return <PythonSnippet onDismiss={onDismiss} />;
        case ModalType.DatasetForm:
            return <DatasetForm onDismiss={onDismiss} />;
        default:
            return null;
    }
}
