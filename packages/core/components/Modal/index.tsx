import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction } from "../../state";
import CsvManifest from "./CsvManifest";
import CollectionForm from "./CollectionForm";
import PythonSnippet from "./PythonSnippet";
import TipsAndTricks from "./TipsAndTricks";

export interface ModalProps {
    onDismiss: () => void;
}

export enum ModalType {
    CreateCollectionForm = 1,
    CsvManifest = 2,
    EditCollectionForm = 3,
    PythonSnippet = 4,
    TipsAndTricks = 5,
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
        case ModalType.CreateCollectionForm:
            return <CollectionForm onDismiss={onDismiss} />;
        case ModalType.CsvManifest:
            return <CsvManifest onDismiss={onDismiss} />;
        case ModalType.EditCollectionForm:
            return <CollectionForm isEditing onDismiss={onDismiss} />;
        case ModalType.PythonSnippet:
            return <PythonSnippet onDismiss={onDismiss} />;
        case ModalType.TipsAndTricks:
            return <TipsAndTricks onDismiss={onDismiss} />;
        default:
            return null;
    }
}
