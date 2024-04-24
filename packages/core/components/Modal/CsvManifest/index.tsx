import { PrimaryButton } from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import AnnotationPicker from "../../AnnotationPicker";
import * as modalSelectors from "../selectors";
import { interaction } from "../../../state";

import styles from "./CsvManifest.module.css";
import classNames from "classnames";

/**
 * Modal overlay for selecting columns to be included in a CSV manifest download of
 * files previously selected.
 */
export default function CsvManifest({ onDismiss }: ModalProps) {
    const dispatch = useDispatch();

    const annotationsPreviouslySelected = useSelector(
        modalSelectors.getAnnotationsPreviouslySelected
    );
    const [selectedAnnotations, setSelectedAnnotations] = React.useState(
        annotationsPreviouslySelected
    );

    const onDownload = () => {
        onDismiss();
        dispatch(interaction.actions.downloadManifest(selectedAnnotations));
    };

    const body = (
        <>
            <p>Select which annotations you would like included as columns in the downloaded CSV</p>
            <AnnotationPicker
                hasSelectAllCapability
                className={styles.annotationSelector}
                selections={selectedAnnotations}
                setSelections={setSelectedAnnotations}
            />
        </>
    );

    return (
        <BaseModal
            body={body}
            footer={
                <PrimaryButton
                    className={classNames(styles.downloadButton, {
                        [styles.disabled]: !selectedAnnotations.length,
                    })}
                    iconProps={{ iconName: "Download" }}
                    disabled={!selectedAnnotations.length}
                    onClick={onDownload}
                    text="Download"
                />
            }
            onDismiss={onDismiss}
            title="Download CSV Manifest"
        />
    );
}
