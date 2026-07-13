import { DefaultButton, Icon } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import FilePrompt from "./FilePrompt";
import { PrimaryButton } from "../Buttons";
import { Source } from "../../entity/SearchParams";

import styles from "./DataSourcePrompt.module.css";

const ADDITIONAL_COLUMN_DETAILS = [
    'If a "Thumbnail" column is present, it should contain a web URL to a thumbnail image for the file. ',
    'If a "File Name" column is present, it should be the file\'s name, which will replace the "File Name" created by default from the path. ',
    'If a "File Size" column is present, it should contain the size of the file in bytes, providing feedback to the user during downloads. ',
    'If an "Uploaded" column is present, it should contain the date the file was uploaded to the storage and be formatted as YYYY-MM-DD HH:MM:SS.Z where Z is a timezone offset. ',
];

interface DataSourceTemplateProps {
    description: string;
    onSelectFile: (file?: Source) => void;
    onSubmit: () => void;
    className?: string;
    isModal?: boolean;
    selectedFile?: Source;
    showAdvancedOptions?: boolean;
    submitDisabled?: boolean;
    title?: string;
}

export default function DataSourcePromptTemplate(
    props: React.PropsWithChildren<DataSourceTemplateProps>
) {
    const [isDataSourceDetailExpanded, setIsDataSourceDetailExpanded] = React.useState(false);
    return (
        <div className={classNames(props.className, styles.root)}>
            {!props.isModal && <h2 className={styles.title}>{props.title}</h2>}
            <p
                className={classNames(styles.text, {
                    [styles.datasourceSubhead]: !props?.isModal,
                })}
            >
                {props.description}
            </p>
            <div className={styles.filePromptOuterWrapper}>
                <FilePrompt
                    className={styles.filePrompt}
                    onSelectFile={props.onSelectFile}
                    selectedFile={props.selectedFile}
                    parentId={`file-prompt-${props.isModal ? "modal" : "main"}`}
                    lightBackground={props.isModal}
                />
                {props.children}
                <div className={styles.loadButtonContainer}>
                    <PrimaryButton
                        className={classNames(styles.loadButton)}
                        disabled={props.submitDisabled}
                        text="LOAD"
                        onClick={props.onSubmit}
                    />
                </div>
            </div>

            {!!props?.showAdvancedOptions && (
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
