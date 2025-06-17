import { DefaultButton, Icon } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import FilePrompt from "./FilePrompt";
import { LinkLikeButton, PrimaryButton, SecondaryButton } from "../Buttons";
import { Source } from "../../entity/SearchParams";
import { interaction, selection } from "../../state";
import { DataSourcePromptInfo } from "../../state/interaction/actions";

import styles from "./DataSourcePrompt.module.css";

interface Props {
    className?: string;
    hideTitle?: boolean;
}

const ADDITIONAL_COLUMN_DETAILS = [
    'If a "Thumbnail" column is present it should contain a web URL to a thumbnail image for the file. ',
    'If a "File Name" column is present it should be the file\'s name (this will replace the "File Name" created by default from the path). ',
    'If a "File Size" column is present it should contain the size of the file in bytes. This is used for showing feedback to the user during downloads. ',
    'If an "Uploaded" column is present it should contain the date the file was uploaded to the storage and be formatted as YYYY-MM-DD HH:MM:SS.Z where Z is a timezone offset. ',
];

/**
 * Dialog meant to prompt user to select a data source option
 */
export default function DataSourcePrompt(props: Props) {
    const dispatch = useDispatch();

    const selectedDataSources = useSelector(selection.selectors.getSelectedDataSources);
    const dataSourceInfo = useSelector(interaction.selectors.getDataSourceInfoForVisibleModal);
    const { query } = dataSourceInfo || ({} as DataSourcePromptInfo);
    const requiresDataSourceReload = useSelector(selection.selectors.getRequiresDataSourceReload);

    const [dataSource, setDataSource] = React.useState<Source>();
    const [metadataSource, setMetadataSource] = React.useState<Source>();
    const [showAdvancedOptions, setShowAdvancedOptions] = React.useState(false);
    const [isDataSourceDetailExpanded, setIsDataSourceDetailExpanded] = React.useState(false);

    const onDismiss = () => {
        dispatch(interaction.actions.hideVisibleModal());
    };

    const onSubmit = (dataSource: Source, metadataSource?: Source) => {
        if (requiresDataSourceReload || query) {
            if (metadataSource) {
                dispatch(selection.actions.changeSourceMetadata(metadataSource));
            }

            if (requiresDataSourceReload) {
                dispatch(selection.actions.replaceDataSource(dataSource));
            } else {
                dispatch(selection.actions.changeDataSources([...selectedDataSources, dataSource]));
            }
        } else {
            dispatch(
                selection.actions.addQuery({
                    name: `New ${dataSource.name} Query`,
                    parts: { sources: [dataSource], sourceMetadata: metadataSource },
                })
            );
        }

        onDismiss();
    };

    return (
        <div className={props.className}>
            {!props.hideTitle && <h2 className={styles.title}>Choose a data source</h2>}
            <p
                className={classNames(styles.text, {
                    [styles.datasourceSubhead]: !props?.hideTitle,
                })}
            >
                To get started, load a CSV, Parquet, or JSON file containing metadata (annotations)
                about your files to view them.
            </p>
            <p
                className={classNames(styles.text, {
                    [styles.datasourceSubhead]: !props?.hideTitle,
                })}
            >
                The first row should contain metadata tags, and each subsequent row include metadata
                for a file, with &quot;File Path&quot; being the only required column. Other columns
                are optional and can be used for querying additional file metadata.
            </p>
            <p
                className={classNames(styles.text, {
                    [styles.datasourceSubhead]: !props?.hideTitle,
                    [styles.leftTextAlign]: !props?.hideTitle,
                })}
            >
                Example CSV:
            </p>
            <table
                className={classNames(styles.tableExample, {
                    [styles.lightBorder]: !props?.hideTitle,
                })}
            >
                <thead>
                    <tr>
                        <th>File Path</th>
                        <th>Gene (Just an example)</th>
                        <th>Color (Also an example)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>/some/path/to/storage/somewhere.zarr</td>
                        <td>CDH2</td>
                        <td>Blue</td>
                    </tr>
                    <tr>
                        <td>/another/path/to/another/file.txt</td>
                        <td>VIM</td>
                        <td>Green</td>
                    </tr>
                </tbody>
            </table>
            {isDataSourceDetailExpanded ? (
                <>
                    <h4 className={styles.details}>Advanced:</h4>
                    <ul className={styles.detailsList}>
                        <li className={styles.details}>
                            Data source files can be generated by this application by selecting some
                            files, right-clicking, and selecting one of the &quot;Save metadata
                            as&quot; options.
                        </li>
                        <li className={styles.details}>
                            These are additional pre-defined columns that are optional, but will be
                            handled as a special case in the application:
                        </li>
                        <ul className={styles.detailsList}>
                            {ADDITIONAL_COLUMN_DETAILS.map((text) => (
                                <li key={text} className={styles.details}>
                                    {text}
                                </li>
                            ))}
                        </ul>
                        <li className={styles.details}>
                            Optionally, supply an additional metadata source file to add more
                            information about the data source. This file should have a header row
                            column named &quot;Column Name&quot; and another column named
                            &quot;Description&quot; and a row with the details for each filled in
                            for any columns present in the actual data source you would like to
                            describe.
                        </li>
                    </ul>
                    <div
                        className={classNames(styles.subtitleButtonContainer, {
                            [styles.leftAlign]: props.hideTitle,
                        })}
                    >
                        <DefaultButton
                            className={styles.linkLikeButton}
                            onClick={() => setIsDataSourceDetailExpanded(false)}
                        >
                            Show less&nbsp;&nbsp;
                            <Icon iconName="ChevronUp" />
                        </DefaultButton>
                    </div>
                </>
            ) : (
                <div
                    className={classNames(styles.subtitleButtonContainer, {
                        [styles.leftAlign]: props.hideTitle,
                    })}
                >
                    <DefaultButton
                        className={styles.linkLikeButton}
                        onClick={() => setIsDataSourceDetailExpanded(true)}
                    >
                        Show more&nbsp;&nbsp;
                        <Icon iconName="ChevronDown" />
                    </DefaultButton>
                </div>
            )}
            <hr className={styles.divider} />
            <FilePrompt onSelectFile={setDataSource} selectedFile={dataSource} />
            {showAdvancedOptions ? (
                <>
                    <h4 className={styles.advancedOptionsTitle}>(Optional) Add metadata source</h4>
                    <FilePrompt onSelectFile={setMetadataSource} selectedFile={metadataSource} />
                </>
            ) : (
                <LinkLikeButton
                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                    text="(Optional) Add metadata source"
                />
            )}
            <div className={styles.loadButtonContainer}>
                {props.hideTitle && <SecondaryButton text="CANCEL" onClick={() => onDismiss()} />}
                <PrimaryButton
                    disabled={!dataSource}
                    text="LOAD"
                    onClick={() => dataSource && onSubmit(dataSource, metadataSource)}
                />
            </div>
        </div>
    );
}
