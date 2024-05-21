import * as React from "react";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import DataSourcePrompt from "../../DataSourcePrompt";

/**
 * Dialog meant to prompt user to select a data source option
 */
export default function DataSource(props: ModalProps) {
    return (
        <BaseModal
            body={<DataSourcePrompt hideTitle onDismiss={props.onDismiss} />}
            title="Choose a data source"
            onDismiss={props.onDismiss}
        />
    );
}
