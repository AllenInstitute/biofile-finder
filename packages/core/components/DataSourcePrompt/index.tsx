import { DefaultButton, Icon, TextField } from "@fluentui/react";
import { throttle } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction, selection } from "../../state";
import { Source } from "../../entity/FileExplorerURL";

import styles from "./DataSourcePrompt.module.css";

interface Props {
    hideTitle?: boolean;
    onDismiss?: () => void;
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
export default function DataSourcePrompt(props: Props) {
    const dispatch = useDispatch();

    const dataSourceInfo = useSelector(interaction.selectors.getDataSourceInfoForVisibleModal);
    const { source: sourceToReplace, query } = dataSourceInfo || {};

    const [dataSourceURL, setDataSourceURL] = React.useState("");
    const [isDataSourceDetailExpanded, setIsDataSourceDetailExpanded] = React.useState(false);

    const addOrReplaceQuery = (source: Source) => {
        if (sourceToReplace) {
            dispatch(selection.actions.replaceDataSource(source));
        } else if (query) {
            dispatch(selection.actions.addDataSource(source));
        } else {
            dispatch(
                selection.actions.addQuery({
                    name: `New ${source.name} Query`,
                    parts: { sources: [source] },
                })
            );
        }
    };

    const onChooseFile = (evt: React.FormEvent<HTMLInputElement>) => {
        const selectedFile = (evt.target as HTMLInputElement).files?.[0];
        if (selectedFile) {
            // Grab name minus extension
            const nameAndExtension = selectedFile.name.split(".");
            const name = nameAndExtension.slice(0, -1).join("");
            const extension = nameAndExtension.pop();
            if (!(extension === "csv" || extension === "json" || extension === "parquet")) {
                alert("Invalid file type. Please select a .csv, .json, or .parquet file.");
                return;
            }
            addOrReplaceQuery({ name, type: extension, uri: selectedFile });
            props.onDismiss?.();
        }
    };
    const onEnterURL = throttle(
        (evt: React.FormEvent) => {
            evt.preventDefault();
            const uriResource = dataSourceURL
                .substring(dataSourceURL.lastIndexOf("/") + 1)
                .split("?")[0];
            const name = `${uriResource} (${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()})`;
            let extensionGuess = uriResource.split(".").pop();
            if (
                !(
                    extensionGuess === "csv" ||
                    extensionGuess === "json" ||
                    extensionGuess === "parquet"
                )
            ) {
                console.warn("Guess that the source is a CSV file since no extension easily found");
                extensionGuess = "csv";
            }
            addOrReplaceQuery({
                name,
                type: extensionGuess as "csv" | "json" | "parquet",
                uri: dataSourceURL,
            });
        },
        10000,
        { leading: true, trailing: false }
    );

    return (
        <>
            {sourceToReplace && (
                <div className={styles.warning}>
                    <h4>Notice</h4>
                    <p>
                        There was an error loading the data source file &quot;
                        {sourceToReplace.name}&quot;. Please re-select the data source file or a
                        replacement.
                    </p>
                    <p>
                        If this is a local file, the browser&apos;s permissions to access the file
                        may have expired since last time. If so, consider putting the file in a
                        cloud storage and providing the URL to avoid this issue in the future.
                    </p>
                </div>
            )}
            {!props.hideTitle && <h2 className={styles.text}>Choose a data source</h2>}
            <p className={styles.text}>
                To get started, load a CSV, Parquet, or JSON file containing metadata (annotations)
                about your files to view them.
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
}
