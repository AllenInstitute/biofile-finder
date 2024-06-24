import { DefaultButton, Icon, TextField } from "@fluentui/react";
import classNames from "classnames";
import { throttle } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { PrimaryButton } from "../Buttons";
import { interaction, metadata, selection } from "../../state";
import { DataSourcePromptInfo } from "../../state/interaction/actions";
import { getNameAndTypeFromSourceUrl, Source } from "../../entity/FileExplorerURL";

import styles from "./DataSourcePrompt.module.css";

interface Props {
    className?: string;
    hideTitle?: boolean;
}

const ADDITIONAL_COLUMN_DETAILS = [
    'If a "Thumbnail" column (case-sensitive) is present it should contain a web URL to a thumbnail image for the file. ',
    'If a "File Name" column (case-sensitive) is present it should be the file\'s name (this will replace the "File Name" created by default from the path). ',
    'If a "File Size" column (case-sensitive) is present it should contain the size of the file in bytes. ',
    'If an "Uploaded" column (case-sensitive) is present it should contain the date the file was uploaded to the cloud storage and be formatted as YYYY-MM-DD HH:MM:SS.Z where Z is a timezone offset. ',
];

/**
 * Dialog meant to prompt user to select a data source option
 */
export default function DataSourcePrompt(props: Props) {
    const dispatch = useDispatch();

    const selectedDataSources = useSelector(metadata.selectors.getDataSources);
    const dataSourceInfo = useSelector(interaction.selectors.getDataSourceInfoForVisibleModal);
    const { source: sourceToReplace, query } = dataSourceInfo || ({} as DataSourcePromptInfo);

    const [dataSourceURL, setDataSourceURL] = React.useState("");
    const [isDataSourceDetailExpanded, setIsDataSourceDetailExpanded] = React.useState(false);

    const addOrReplaceQuery = (source: Source) => {
        if (sourceToReplace) {
            dispatch(selection.actions.replaceDataSource(source));
        } else if (query) {
            dispatch(selection.actions.changeDataSources([...selectedDataSources, source]));
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
            dispatch(interaction.actions.hideVisibleModal());
        }
    };
    const onEnterURL = throttle(
        (evt: React.FormEvent) => {
            evt.preventDefault();
            const { name, extensionGuess } = getNameAndTypeFromSourceUrl(dataSourceURL);
            addOrReplaceQuery({
                name,
                type: extensionGuess as "csv" | "json" | "parquet",
                uri: dataSourceURL,
            });
            dispatch(interaction.actions.hideVisibleModal());
        },
        10000,
        { leading: true, trailing: false }
    );

    return (
        <div className={props.className}>
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
            {!props.hideTitle && <h2 className={styles.title}>Choose a data source</h2>}
            <p className={styles.text}>
                To get started, load a CSV, Parquet, or JSON file containing metadata (annotations)
                about your files to view them.
            </p>
            {isDataSourceDetailExpanded ? (
                <>
                    <ul className={styles.detailList}>
                        <li className={styles.details}>
                            The file must contain a &quot;File Path&quot; column (case-sensitive) &
                            must be unique by the &quot;File Path&quot; column. Any other columns
                            are optional and will be available as annotations to query by.
                        </li>
                        <li className={styles.details}>
                            The &quot;File Path&quot; column should contain full path to a file in a
                            cloud storage.
                        </li>
                    </ul>
                    <p className={styles.details}>
                        <strong>Advanced:</strong>
                    </p>
                    <ul className={styles.detailList}>
                        <li className={styles.details}>
                            Data source files can be generated by this application by selecting some
                            files, right-clicking, and selecting one of the &quot;Save metadata
                            as&quot; options.
                        </li>
                        <li className={styles.details}>
                            These are additional special columns that are optional, but will be
                            handled as a special case in the application:
                        </li>
                        <ul className={styles.detailList}>
                            {ADDITIONAL_COLUMN_DETAILS.map((text) => (
                                <li key={text} className={styles.details}>
                                    {text}
                                </li>
                            ))}
                        </ul>
                        <li className={styles.subtitleButtonContainer}>
                            <DefaultButton
                                className={styles.subtitleButton}
                                onClick={() => setIsDataSourceDetailExpanded(false)}
                            >
                                Show less&nbsp;&nbsp;
                                <Icon iconName="ChevronUp" />
                            </DefaultButton>
                        </li>
                    </ul>
                </>
            ) : (
                <div className={styles.subtitleButtonContainer}>
                    <DefaultButton
                        className={styles.subtitleButton}
                        onClick={() => setIsDataSourceDetailExpanded(true)}
                    >
                        Show more&nbsp;&nbsp;
                        <Icon iconName="ChevronDown" />
                    </DefaultButton>
                </div>
            )}
            <hr className={styles.divider} />
            <div className={styles.actionsContainer}>
                <form>
                    <label
                        aria-label="Browse for a data source file on your machine"
                        title="Browse for a data source file on your machine"
                        htmlFor="data-source-selector"
                    >
                        <PrimaryButton
                            iconName="DocumentSearch"
                            text="Choose file"
                            title="Choose file"
                        />
                    </label>
                    <input
                        hidden
                        accept=".csv,.json,.parquet"
                        type="file"
                        id="data-source-selector"
                        name="data-source-selector"
                        onChange={onChooseFile}
                    />
                </form>
                <div className={styles.orDivider}>OR</div>
                <form className={styles.urlForm} onSubmit={onEnterURL}>
                    <TextField
                        onChange={(_, newValue) => setDataSourceURL(newValue || "")}
                        placeholder="Paste URL (ex. S3, Azure)..."
                        iconProps={{
                            className: classNames(styles.submitIcon, {
                                [styles.disabled]: !dataSourceURL,
                            }),
                            iconName: "ReturnKey",
                            onClick: onEnterURL,
                        }}
                        value={dataSourceURL}
                    />
                </form>
            </div>
        </div>
    );
}
