import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction } from "../../state";
import CodeSnippet from "./CodeSnippet";
import DataSource from "./DataSource";
import EditMetadata from "./EditMetadata";
import MetadataManifest from "./MetadataManifest";
import SmallScreenWarning from "./SmallScreenWarning";

export interface ModalProps {
    onDismiss: () => void;
}

export enum ModalType {
    CodeSnippet = 1,
    DataSource = 2,
    EditMetadata = 3,
    MetadataManifest = 4,
    SmallScreenWarning = 5,
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
        case ModalType.DataSource:
            return <DataSource onDismiss={onDismiss} />;
        case ModalType.EditMetadata:
            return <EditMetadata onDismiss={onDismiss} />;
        case ModalType.MetadataManifest:
            return <MetadataManifest onDismiss={onDismiss} />;
        case ModalType.SmallScreenWarning:
            return <SmallScreenWarning onDismiss={onDismiss} />;
        default:
            return null;
    }
}
