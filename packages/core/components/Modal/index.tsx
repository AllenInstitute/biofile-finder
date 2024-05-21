import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction } from "../../state";
import CodeSnippet from "./CodeSnippet";
import DataSourcePrompt from "./DataSourcePrompt";
import MetadataManifest from "./MetadataManifest";

export interface ModalProps {
    onDismiss: () => void;
}

export enum ModalType {
    CodeSnippet = 1,
    DataSourcePrompt = 2,
    MetadataManifest = 3,
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
        case ModalType.CodeSnippet:
            return <CodeSnippet onDismiss={onDismiss} />;
        case ModalType.DataSourcePrompt:
            return <DataSourcePrompt onDismiss={onDismiss} />;
        case ModalType.MetadataManifest:
            return <MetadataManifest onDismiss={onDismiss} />;
        default:
            return null;
    }
}
