import { DefaultButton, Icon, TextField } from "@fluentui/react";
import { throttle } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import FileExplorerURL from "../../../entity/FileExplorerURL";
import { interaction, selection } from "../../../state";

import styles from "./DataSourcePrompt.module.css";

interface Props extends ModalProps {
    isEditing?: boolean;
}

const DATA_SOURCE_DETAILS = [
    'The file must contain a "File Path" column (case-sensitive) & must be unique by the "File Path" column. Any other columns are optional and will be available as annotations to query by. ' +
        'The "File Path" column should contain full path to a file in a cloud storage. ',
    "Advanced usage: ",
    "There are additional special columns that are optional, but will be handled as a special case in the application. ",
    'If a "Thumbnail" column (case-sensitive) is present it should contain a web URL to a thumbnail image for the file. ',
    'If a "File Name" column (case-sensitive) is present it should be the file\'s name (this will replace the "File Name" created by default from the path). ',
    'If a "File Size" column (case-sensitive) is present it should contain the size of the file in bytes. ',
    'If an "Uploaded" column (case-sensitive) is present it should contain the date the file was uploaded to the cloud storage and be formatted as YYYY-MM-DD HH:MM:SS.Z where Z is a timezone offset. ',
    'Data source files can be generated by this application by selecting some files, right-clicking, and selecting the "Generate CSV Manifest" option.',
];

/**
 * Dialog meant to prompt user to select a data source option
 */
export default function DataSourcePrompt({ onDismiss }: Props) {
    const dispatch = useDispatch();

    const collectionToReplace = useSelector(interaction.selectors.getCollectionForVisibleModal);

    const [dataSourceURL, setDataSourceURL] = React.useState("");
    const [isDataSourceDetailExpanded, setIsDataSourceDetailExpanded] = React.useState(false);

    const addOrReplaceQuery = (name: string, uri: File | string) => {
        const query = {
            name: collectionToReplace ? collectionToReplace.name : `New ${name} Query`,
            url: FileExplorerURL.encode({
                collection: {
                    name: collectionToReplace ? collectionToReplace.name : name,
                    uri,
                    version: 1,
                },
            }),
        };
        if (collectionToReplace) {
            dispatch(selection.actions.addQuery(query));
        } else {
            dispatch(selection.actions.changeQuery(query));
        }
    };

    const onChooseFile = (evt: React.FormEvent<HTMLInputElement>) => {
        const selectedFile = (evt.target as HTMLInputElement).files?.[0];
        if (selectedFile) {
            // Grab name minus extension
            const name = selectedFile.name.split(".").slice(0, -1).join("");
            addOrReplaceQuery(name, selectedFile);
            onDismiss();
        }
    };
    const onEnterURL = throttle(
        (evt: React.FormEvent) => {
            evt.preventDefault();
            const uriResource = dataSourceURL
                .substring(dataSourceURL.lastIndexOf("/") + 1)
                .split("?")[0];
            const name = `${uriResource} (${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()})`;
            addOrReplaceQuery(name, dataSourceURL);
            onDismiss();
        },
        10000,
        { leading: true, trailing: false }
    );

    const body = (
        <>
            {collectionToReplace && (
                <div className={styles.warning}>
                    <h4>Notice</h4>
                    <p>
                        There was an error loading the data source file &quot;
                        {collectionToReplace.name}&quot;. Please re-select the data source file or a
                        replacement.
                    </p>
                    <p>
                        This may have been due to this being a local file that the browser&apos;s
                        permissions to access has expired since last time. If so, consider putting
                        the file in a cloud storage and providing the URL to avoid this issue in the
                        future.
                    </p>
                </div>
            )}
            <p className={styles.text}>
                Please provide a &quot;.csv&quot;, &quot;.parquet&quot;, or &quot;.json&quot; file
                containing metadata about some files. See more details for information about what a
                data source file should look like...
            </p>
            {isDataSourceDetailExpanded ? (
                <div>
                    {DATA_SOURCE_DETAILS.map((text) => (
                        <p key={text} className={styles.text}>
                            {text}
                        </p>
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
                <form className={styles.fileInputForm}>
                    <label
                        className={styles.fileInputLabel}
                        aria-label="Browse for a data source file on your machine"
                        title="Browse for a data source file on your machine"
                        htmlFor="data-source-selector"
                    >
                        <Icon iconName="DocumentSearch" />
                        <p>Choose File</p>
                    </label>
                    <input
                        className={styles.fileInput}
                        accept=".csv,.json,.parquet"
                        type="file"
                        id="data-source-selector"
                        name="data-source-selector"
                        onChange={onChooseFile}
                    />
                </form>
                <div className={styles.orDivider}>
                    <hr />
                    or
                    <hr />
                </div>
                <form className={styles.urlForm} onSubmit={onEnterURL}>
                    <TextField
                        onChange={(_, newValue) => setDataSourceURL(newValue || "")}
                        placeholder="Paste URL (ex. S3, Azure)"
                        iconProps={{ iconName: "ReturnKey" }}
                        value={dataSourceURL}
                    />
                </form>
            </div>
        </>
    );

    return <BaseModal body={body} title="Choose a data source" onDismiss={onDismiss} />;
}
