import axios from "axios";
import { ActionButton, DefaultButton, Icon, TextField } from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { ModalProps, ModalType } from "..";
import BaseModal from "../BaseModal";

import styles from "./DataSourcePrompt.module.css";
import { interaction } from "../../../state";
import { debounce } from "lodash";

interface Props extends ModalProps {
    isEditing?: boolean;
}

const DATA_SOURCE_DETAILS = [
    "The files must contain at least the following columns: 'file_name', 'file_size', 'file_path', 'file_id', and 'uploaded' & must be unique by the 'file_path' column. Any other columns are optional and will be available as annotations to query by.",
    "The 'file_path' column should contain the full path to the file in the cloud storage. The 'file_id' column should contain a unique identifier for the file. The 'uploaded' column should contain the date the file was uploaded to the cloud storage.",
    'Data source files can be generating by this application by selecting some files, right-clicking, and selecting the "Generate CSV Manifest" option.å',
];

/**
 * TODO
 */
export default function DataSourcePrompt({ onDismiss }: Props) {
    const dispatch = useDispatch();

    const [dataSourceUri, setDataSourceUri] = React.useState("");
    const [isDataSourceDetailExpanded, setIsDataSourceDetailExpanded] = React.useState(false);
    const fileExplorerServiceBaseUrl = useSelector(
        interaction.selectors.getFileExplorerServiceBaseUrl
    );

    const [isAICSEmployee, setIsAICSEmployee] = React.useState(false);
    React.useEffect(() => {
        try {
            axios.create().get(fileExplorerServiceBaseUrl);
            onDismiss();
        } catch (err) {
            console.log("Unable to connect to AICS network");
            dispatch(interaction.actions.setVisibleModal(ModalType.DataSourcePrompt));
        }
    }, [dispatch, onDismiss, fileExplorerServiceBaseUrl]);

    const onIsAllenEmployee = debounce(
        () => {
            setIsAICSEmployee(!isAICSEmployee);
            dispatch(interaction.actions.refresh());
        },
        1000,
        { leading: true, trailing: false }
    );

    const body = (
        <>
            <h3>Choose a data source</h3>
            <p>
                Please provide a &quot;.csv&quot;, &quot;.parquet&quot;, or &quot;.json&quot; file
                containing metadata about some files. See more details for information about what
                data source file should look like...
            </p>
            {isDataSourceDetailExpanded ? (
                <div>
                    {DATA_SOURCE_DETAILS.map((text) => (
                        <p key={text}>{text}</p>
                    ))}
                    <div className={styles.subtitleButtonContainer}>
                        <DefaultButton
                            className={styles.subtitleButton}
                            onClick={() => setIsDataSourceDetailExpanded(false)}
                        >
                            LESS&nbsp;
                            <Icon iconName="CaretSolidUp" />
                        </DefaultButton>
                    </div>
                </div>
            ) : (
                <div className={styles.subtitleButtonContainer}>
                    <DefaultButton
                        className={styles.subtitleButton}
                        onClick={() => setIsDataSourceDetailExpanded(true)}
                    >
                        MORE&nbsp;
                        <Icon iconName="CaretSolidDown" />
                    </DefaultButton>
                </div>
            )}
            <div className={styles.actionsContainer}>
                <DefaultButton
                    className={styles.browseButton}
                    ariaLabel="Browse for a data source file on your machine"
                    iconProps={{ iconName: "DocumentSearch" }}
                    onClick={() => dispatch(interaction.actions.openCsvCollection())}
                    text="Choose File"
                    title="Browse for a data source file on your machine"
                />
                <p>---- or ----</p>
                <TextField
                    className={styles.urlInput}
                    label="Paste URL (ex. S3, Azure)"
                    onChange={(_, newValue) => setDataSourceUri(newValue || "")}
                    placeholder="https://example.com/path/to/data.csv"
                    value={dataSourceUri}
                />
            </div>
            <ActionButton
                allowDisabledFocus
                className={styles.aiEmployeePrompt}
                onClick={onIsAllenEmployee}
            >
                Allen Institute employee?
            </ActionButton>
            {isAICSEmployee && (
                <p>
                    Unable to connect to necessary server in the Allen Institute network. Check WiFi
                    or VPN connection.
                </p>
            )}
        </>
    );

    return (
        <BaseModal
            body={body}
            // footer={}
            onDismiss={onDismiss}
            title={"Select a data source"}
        />
    );
}
