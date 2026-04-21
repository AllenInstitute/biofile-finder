import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction } from "../../state";
import About from "./About";
import DataSource from "./DataSource";

export interface ModalProps {
    onDismiss: () => void;
}

export enum ModalType {
    About = 1,
    QueryCodeSnippet = 2,
    CopyFileManifest = 3,
    DataSource = 4,
    EditMetadata = 5,
    MetadataManifest = 6,
    SmallScreenWarning = 7,
    ExtractMetadataCodeSnippet = 8,
    ConvertFiles = 9,
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
        case ModalType.About:
            return <About onDismiss={onDismiss} />;
        case ModalType.DataSource:
            return <DataSource onDismiss={onDismiss} />;
        default:
            return null;
    }
}
