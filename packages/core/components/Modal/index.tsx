import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction } from "../../state";
import ApplicationSelection from "./ApplicationSelection";
import CsvManifest from "./CsvManifest";
import PythonSnippet from "./PythonSnippet";
import PythonSnippetForm from "./PythonSnippetForm";

export interface ModalProps {
    onDismiss: () => void;
}

export enum ModalType {
    ApplicationSelection = 1,
    CsvManifest = 2,
    PythonSnippet = 3,
    PythonSnippetForm = 4,
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
        case ModalType.ApplicationSelection:
            return <ApplicationSelection onDismiss={onDismiss} />;
        case ModalType.CsvManifest:
            return <CsvManifest onDismiss={onDismiss} />;
        case ModalType.PythonSnippet:
            return <PythonSnippet onDismiss={onDismiss} />;
        case ModalType.PythonSnippetForm:
            return <PythonSnippetForm onDismiss={onDismiss} />;
        default:
            return null;
    }
}
