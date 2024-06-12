import { DefaultButton } from "@fluentui/react";
import * as React from "react";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import styles from "./EditMetadata.module.css";

interface Props extends ModalProps {
    isEditing?: boolean;
}

/**
 * Dialog meant to prompt user to select a data source option
 */
export default function EditMetadata({ onDismiss }: Props) {
    const footer = (
        <>
            <DefaultButton text="Cancel" onClick={onDismiss} />
            <DefaultButton text="Save" />
        </>
    );
    const body = (
        <>
            <p className={styles.text}>
                We will need to provide additional information here about the editing process. In
                particular, it needs to be clear that this is overwriting data in MMMS and that some
                fields may not be directly editable because of the way some data is inferred.
            </p>
            <div className={styles.actionsContainer}>
                <div>This could be a single row or table</div>
            </div>
        </>
    );

    return <BaseModal body={body} footer={footer} title="Edit Metatata" onDismiss={onDismiss} />;
}
