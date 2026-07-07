import * as React from "react";
import { useSelector } from "react-redux";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import DataSourcePrompt, { DataSourceType, DataSourceTypeToString } from "../../DataSourcePrompt";
import { interaction } from "../../../state";
import { DataSourcePromptInfo } from "../../../state/interaction/actions";

import styles from "./DataSource.module.css";

/**
 * Dialog meant to prompt user to select a data source option
 */
export default function DataSource(props: ModalProps) {
    const dataSourceInfo = useSelector(interaction.selectors.getDataSourceInfoForVisibleModal);
    const { sourceType = DataSourceType.default } = dataSourceInfo || ({} as DataSourcePromptInfo);
    return (
        <BaseModal
            body={<DataSourcePrompt className={styles.content} isModal />}
            title={`Choose a ${DataSourceTypeToString(sourceType)}`}
            onDismiss={props.onDismiss}
        />
    );
}
