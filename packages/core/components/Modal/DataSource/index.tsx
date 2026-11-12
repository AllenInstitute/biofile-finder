import * as React from "react";
import { useSelector } from "react-redux";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import DataSourcePrompt, { DataSourceType } from "../../DataSourcePrompt";
import { interaction } from "../../../state";
import { DataSourcePromptInfo } from "../../../state/interaction/actions";

import styles from "./DataSource.module.css";

/**
 * Dialog meant to prompt user to select a data source option
 */
export default function DataSource(props: ModalProps) {
    const dataSourceInfo = useSelector(interaction.selectors.getDataSourceInfoForVisibleModal);
    const { sourceType = DataSourceType.default } = dataSourceInfo || ({} as DataSourcePromptInfo);
    const getTitle = (sourceType: DataSourceType) => {
        switch (sourceType) {
            case DataSourceType.metadata:
                return "Provide a column descriptor file";
            case DataSourceType.provenance:
                return "Provide a provenance descriptor file";
            case DataSourceType.default:
            default:
                return "Provide a metadata file";
        }
    };

    return (
        <BaseModal
            body={<DataSourcePrompt className={styles.content} isModal />}
            title={getTitle(sourceType)}
            onDismiss={props.onDismiss}
        />
    );
}
