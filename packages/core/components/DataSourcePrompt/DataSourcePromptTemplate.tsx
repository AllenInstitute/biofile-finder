import classNames from "classnames";
import * as React from "react";

import FilePrompt from "./FilePrompt";
import { PrimaryButton } from "../Buttons";
import { Source } from "../../entity/SearchParams";

import styles from "./DataSourcePrompt.module.css";

// Absolute since this component is shared with the desktop app, where relative paths do not resolve
const USER_GUIDE_METADATA_FILE_URL =
    "https://bff.allencell.org/user-guide/getting-started/creating-a-metadata-file";

interface DataSourceTemplateProps {
    description: string;
    onSelectFile: (file?: Source) => void;
    onSubmit: () => void;
    className?: string;
    isModal?: boolean;
    selectedFile?: Source;
    showGuidanceLink?: boolean;
    submitDisabled?: boolean;
    title?: string;
}

export default function DataSourcePromptTemplate(
    props: React.PropsWithChildren<DataSourceTemplateProps>
) {
    const showCard = !props.isModal && !!props.selectedFile;

    return (
        <div className={classNames(props.className, styles.root)}>
            {!props.isModal && <h1 className={styles.title}>{props.title}</h1>}
            <p
                className={classNames(styles.text, {
                    [styles.datasourceSubhead]: !props?.isModal,
                })}
            >
                {props.description}
                {props.showGuidanceLink && (
                    <>
                        {" "}
                        <a
                            className={styles.guidanceLink}
                            href={USER_GUIDE_METADATA_FILE_URL}
                            target="_blank"
                            rel="noreferrer"
                        >
                            Read full guidance
                        </a>
                    </>
                )}
            </p>
            <div
                className={classNames(styles.filePromptOuterWrapper, {
                    [styles.filePromptCard]: showCard,
                    [styles.filePromptSelectedInModal]: props.isModal && !!props.selectedFile,
                })}
            >
                {showCard && <h2 className={styles.cardTitle}>Loading files</h2>}
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
        </div>
    );
}
