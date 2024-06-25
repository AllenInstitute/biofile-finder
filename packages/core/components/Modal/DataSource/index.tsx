import * as React from "react";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import DataSourcePrompt from "../../DataSourcePrompt";

import styles from "./DataSource.module.css";

/**
 * Dialog meant to prompt user to select a data source option
 */
export default function DataSource(props: ModalProps) {
    return (
        <BaseModal
            body={<DataSourcePrompt className={styles.content} hideTitle />}
            title="Choose a data source"
            onDismiss={props.onDismiss}
        />
    );
}
