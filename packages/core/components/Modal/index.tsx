import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction } from "../../state";
import CsvManifest from "./CsvManifest";
import DataSourcePrompt from "./DataSourcePrompt";
import PythonSnippet from "./PythonSnippet";

export interface ModalProps {
    onDismiss: () => void;
}

export enum ModalType {
    CsvManifest = 1,
    DataSourcePrompt = 2,
    PythonSnippet = 3,
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
        case ModalType.DataSourcePrompt:
            return <DataSourcePrompt onDismiss={onDismiss} />;
        case ModalType.PythonSnippet:
            return <PythonSnippet onDismiss={onDismiss} />;
        default:
            return null;
    }
}
