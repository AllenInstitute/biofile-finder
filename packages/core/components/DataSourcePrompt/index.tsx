import { DefaultButton, Icon, IconButton } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import FilePrompt from "./FilePrompt";
import { LinkLikeButton, PrimaryButton } from "../Buttons";
import { Source } from "../../entity/SearchParams";
import { interaction, selection } from "../../state";
import { DataSourcePromptInfo } from "../../state/interaction/actions";

import styles from "./DataSourcePrompt.module.css";

interface Props {
    className?: string;
    isModal?: boolean;
}

const ADDITIONAL_COLUMN_DETAILS = [
    'If a "Thumbnail" column is present, it should contain a web URL to a thumbnail image for the file. ',
    'If a "File Name" column is present, it should be the file\'s name, which will replace the "File Name" created by default from the path. ',
    'If a "File Size" column is present, it should contain the size of the file in bytes, providing feedback to the user during downloads. ',
    'If an "Uploaded" column is present, it should contain the date the file was uploaded to the storage and be formatted as YYYY-MM-DD HH:MM:SS.Z where Z is a timezone offset. ',
];

export enum DataSourceType {
    default = 0,
    metadata = 1,
    provenance = 2,
}

/**
 * Dialog meant to prompt user to select a data source option
 */
export default function DataSourcePrompt(props: Props) {
    const dispatch = useDispatch();

    const selectedDataSources = useSelector(selection.selectors.getSelectedDataSources);
    const dataSourceInfo = useSelector(interaction.selectors.getDataSourceInfoForVisibleModal);
    const { query, sourceType = DataSourceType.default } =
        dataSourceInfo || ({} as DataSourcePromptInfo);
    const requiresDataSourceReload = useSelector(selection.selectors.getRequiresDataSourceReload);

    const [dataSource, setDataSource] = React.useState<Source>();
    const [metadataSource, setMetadataSource] = React.useState<Source>();
    const [showAdvancedOptions, setShowAdvancedOptions] = React.useState(false);
    const [isDataSourceDetailExpanded, setIsDataSourceDetailExpanded] = React.useState(false);

    const onDismiss = () => {
        dispatch(interaction.actions.hideVisibleModal());
    };

    const onSubmit = (dataSource: Source, metadataSource?: Source) => {
        if (sourceType === DataSourceType.provenance) {
            if (dataSource) {
                dispatch(selection.actions.changeProvenanceSource(dataSource));
            }
            // To do: include provenance source in query as with metadatasource
            return onDismiss();
        }
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
                    loading: true,
                })
            );
        }

        onDismiss();
    };

    const advancedOptions = (
        <div
            className={classNames(
                styles.fullWidth,
                metadataSource ? styles.advancedOptionsFilled : styles.advancedOptionsEmpty
            )}
        >
            {!metadataSource && (
                <div className={styles.advancedOptionsHeader}>
                    <h4 className={styles.fullWidth}>Add metadata descriptor file (optional)</h4>
                    <IconButton
                        className={styles.iconButton}
                        iconProps={{ iconName: "Cancel" }}
                        onClick={() => {
                            setMetadataSource(undefined);
                            setShowAdvancedOptions(false);
                        }}
                    />
                </div>
            )}
            <div className={styles.filePromptWrapper}>
                <FilePrompt
                    className={classNames(styles.filePrompt, styles.filePromptWide)}
                    onSelectFile={setMetadataSource}
                    selectedFile={metadataSource}
                    parentId={`file-prompt-metadata-${props.isModal ? "modal" : "main"}`}
                    fileLabel={"Metadata descriptor file: "}
                    lightBackground={props.isModal}
                />
            </div>
        </div>
    );

    return (
        <div className={classNames(props.className, styles.root)}>
            {!props.isModal && <h2 className={styles.title}>Choose a data source</h2>}
            <p
                className={classNames(styles.text, {
                    [styles.datasourceSubhead]: !props?.isModal,
                })}
            >
                Load a CSV, Parquet, or JSON file containing the metadata key-value pairs
                (annotations) associated with your files.
            </p>
            <div className={styles.filePromptOuterWrapper}>
                <FilePrompt
                    className={styles.filePrompt}
                    onSelectFile={setDataSource}
                    selectedFile={dataSource}
                    parentId={`file-prompt-${props.isModal ? "modal" : "main"}`}
                    lightBackground={props.isModal}
                />
                {showAdvancedOptions
                    ? advancedOptions
                    : sourceType === DataSourceType.default && (
                          <LinkLikeButton
                              className={styles.advancedOptionsButton}
                              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                              text="Add metadata descriptor file (optional)"
                          />
                      )}
                <div className={styles.loadButtonContainer}>
                    <PrimaryButton
                        className={classNames(styles.loadButton)}
                        disabled={!dataSource && !metadataSource}
                        text="LOAD"
                        onClick={() => dataSource && onSubmit(dataSource, metadataSource)}
                    />
                </div>
            </div>
            {sourceType === DataSourceType.default && (
                <div className={styles.guidance}>
                    <hr className={styles.divider} />
                    <h4 className={styles.subheader}>Getting started guidance and example CSV</h4>
                    <table
                        className={classNames(
                            styles.tableExample,
                            props?.isModal ? styles.darkHeader : styles.lightBorder
                        )}
                    >
                        <thead>
                            <tr>
                                <th>
                                    File Path <i>(required metadata key)</i>
                                </th>
                                <th>
                                    Gene <i>(example metadata key)</i>
                                </th>
                                <th>
                                    Color <i>(example metadata key)</i>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>/folder/folder/my_storage/filename.zarr</td>
                                <td>CDH2</td>
                                <td>Blue</td>
                            </tr>
                            <tr>
                                <td>/folder/my_storage/filename.txt</td>
                                <td>VIM</td>
                                <td>Green</td>
                            </tr>
                        </tbody>
                    </table>
                    <h4 className={styles.subheader}>Minimum requirements</h4>
                    <ul className={styles.detailsList}>
                        <li>
                            The first row should contain metadata keys (i.e., column headers), with
                            &quot;File Path&quot; being the only required key.
                        </li>
                        <li>
                            Each subsequent row should contain the values of corresponding keys for
                            each file.
                        </li>
                    </ul>

                    {isDataSourceDetailExpanded ? (
                        <>
                            <h4 className={styles.subheader}>Advanced:</h4>
                            <ul className={styles.detailsList}>
                                <li>
                                    Data source files can be generated by this application by
                                    selecting some files, right-clicking, and selecting one of the
                                    &quot;Save metadata as&quot; options.
                                </li>
                                <li>
                                    The following are optional pre-defined columns that are handled
                                    as special cases:
                                </li>
                                <ul className={styles.detailsList}>
                                    {ADDITIONAL_COLUMN_DETAILS.map((text) => (
                                        <li key={text} className={styles.details}>
                                            {text}
                                        </li>
                                    ))}
                                </ul>
                                <li className={styles.details}>
                                    Optionally, you can supply an additional metadata descriptor
                                    file to add more information about the data source. This file
                                    should have a header row column named &quot;Column Name&quot;
                                    and another column named &quot;Description&quot;. Each
                                    subsequent row should contain the details for any columns
                                    present in the actual data source you would like to describe.
                                </li>
                            </ul>
                            <div
                                className={classNames(styles.subtitleButtonContainer, {
                                    [styles.leftAlign]: props.isModal,
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
                                [styles.leftAlign]: props.isModal,
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
                </div>
            )}
        </div>
    );
}
