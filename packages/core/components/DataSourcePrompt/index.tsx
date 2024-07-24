import { Checkbox, DefaultButton, Icon } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import FilePrompt from "./FilePrompt";
import { Source } from "../../entity/FileExplorerURL";
import { interaction, selection } from "../../state";
import { DataSourcePromptInfo } from "../../state/interaction/actions";

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

    const selectedDataSources = useSelector(selection.selectors.getSelectedDataSources);
    const dataSourceInfo = useSelector(interaction.selectors.getDataSourceInfoForVisibleModal);
    const { source: sourceToReplace, query } = dataSourceInfo || ({} as DataSourcePromptInfo);

    const [dataSource, setDataSource] = React.useState<Source>();
    const [metadataSource, setMetadataSource] = React.useState<Source>();
    const [hasMetadataSource, setHasMetadataSource] = React.useState(false);
    const [isDataSourceDetailExpanded, setIsDataSourceDetailExpanded] = React.useState(false);

    const onSubmit = (dataSource?: Source, metadataSource?: Source) => {
        if (dataSource && (metadataSource || !hasMetadataSource)) {
            if (sourceToReplace) {
                dispatch(selection.actions.replaceDataSource(dataSource));
                dispatch(selection.actions.changeSourceMetadata(metadataSource));
            } else if (query) {
                dispatch(selection.actions.changeDataSources([...selectedDataSources, dataSource]));
                dispatch(selection.actions.changeSourceMetadata(metadataSource));
            } else {
                dispatch(
                    selection.actions.addQuery({
                        name: `New ${dataSource.name} Query`,
                        parts: { sources: [dataSource], sourceMetadata: metadataSource },
                    })
                );
            }

            dispatch(interaction.actions.hideVisibleModal());
        }
    };

    const onSelectSource = (source: Source) => {
        setDataSource(source);
        onSubmit(source, metadataSource);
    };

    const onSelectMetadataSource = (source: Source) => {
        setMetadataSource(source);
        onSubmit(dataSource, source);
    };

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
                        <li className={styles.details}>
                            Optionally, supply an additional metadata source file to add more
                            information about the data source. This file should have a column
                            containing each column you want to provide additional information about.
                            Each row following the first, which should contain the column names,
                            should contain a description of the column.
                        </li>
                        <ul className={styles.detailList}></ul>
                        <li
                            className={classNames(styles.subtitleButtonContainer, {
                                [styles.leftAlign]: props.hideTitle,
                            })}
                        >
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
                <div
                    className={classNames(styles.subtitleButtonContainer, {
                        [styles.leftAlign]: props.hideTitle,
                    })}
                >
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
            <FilePrompt onSelectFile={onSelectSource} selectedFile={dataSource} />
            <div
                className={classNames(styles.checkboxFormContainer, {
                    [styles.selected]: hasMetadataSource,
                })}
            >
                <div
                    className={styles.checkboxContainer}
                    onClick={() => {
                        setHasMetadataSource(!hasMetadataSource);
                        if (hasMetadataSource) {
                            setMetadataSource(undefined);
                            onSubmit(dataSource, undefined);
                        }
                    }}
                >
                    <Checkbox
                        className={classNames(styles.checkbox, {
                            [styles.selected]: hasMetadataSource,
                        })}
                        checked={hasMetadataSource}
                    />
                    <p>Input additional metadata source</p>
                </div>
                {hasMetadataSource && (
                    <FilePrompt
                        onSelectFile={onSelectMetadataSource}
                        selectedFile={metadataSource}
                    />
                )}
            </div>
        </div>
    );
}
