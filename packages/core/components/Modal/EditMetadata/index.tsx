import classNames from "classnames";
import * as React from "react";
import { useSelector } from "react-redux";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import { PrimaryButton, SecondaryButton } from "../../Buttons";
import EditMetadataForm from "../../EditMetadata";
import { selection } from "../../../state";
import FileSelection from "../../../entity/FileSelection";

import styles from "./EditMetadata.module.css";

/**
 * Dialog to display workflow for editing metadata for selected files
 */
export default function EditMetadata({ onDismiss }: ModalProps) {
    const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState<boolean>(false);
    const [showWarning, setShowWarning] = React.useState<boolean>(false);
    const fileSelection = useSelector(
        selection.selectors.getFileSelection,
        FileSelection.selectionsAreEqual
    );
    const totalFilesSelected = fileSelection.count();
    const filesSelectedCountString = `(${totalFilesSelected} file${
        totalFilesSelected === 1 ? "" : "s"
    })`;

    function onDismissWithWarning() {
        if (hasUnsavedChanges) setShowWarning(true);
        else onDismiss();
    }

    return (
        <BaseModal
            body={
                // Use styling instead of conditionals to persist rendered data
                <>
                    <EditMetadataForm
                        className={classNames({ [styles.hidden]: showWarning })}
                        onDismiss={onDismissWithWarning}
                        setHasUnsavedChanges={setHasUnsavedChanges}
                    />
                    <div className={classNames({ [styles.hidden]: !showWarning })}>
                        <p className={styles.warning}>
                            Some edits will not be completed and could cause inaccuracies. Are you
                            sure you want to quit now?
                        </p>
                        <div className={classNames(styles.footer, styles.footerAlignRight)}>
                            <SecondaryButton
                                title=""
                                text="Back"
                                onClick={() => setShowWarning(false)}
                            />
                            <PrimaryButton title="" text="Yes, Quit" onClick={onDismiss} />
                        </div>
                    </div>
                </>
            }
            isStatic
            onDismiss={onDismissWithWarning}
            title={
                showWarning
                    ? "Warning! Edits in progress."
                    : `Edit metadata ${filesSelectedCountString}`
            }
        />
    );
}
