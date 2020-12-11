import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction } from "../../state";
import CsvManifest from "./CsvManifest";
import PythonSnippet from "./PythonSnippet";
import PythonSnippetForm from "./PythonSnippetForm";

export interface DialogModalProps {
    onDismiss: () => void;
}

export enum ModalType {
    CsvManifest = 1,
    PythonSnippet = 2,
    PythonSnippetForm = 3,
}

/**
 * Controller for determining which dialog modal to render
 */
export default function DialogModal() {
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
        case ModalType.PythonSnippetForm:
            return <PythonSnippetForm onDismiss={onDismiss} />;
        default:
            return null;
    }
}
