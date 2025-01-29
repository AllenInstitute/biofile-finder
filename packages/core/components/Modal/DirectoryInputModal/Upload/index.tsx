import * as React from "react";

import { SecondaryButton } from "../../../Buttons";

import styles from "./Upload.module.css";

export interface Files {
    filesToUpload: any[];
    filesCompleted: any[];
}

interface Props {
    files: Files
    onCancel: () => void;
    errorLogs?: { filePath: string, error: Error }[];
}

/**
 * TODO
 */
export default function Upload(props: Props) {
    const { files } = props;
    const isUploadComplete = !files.filesToUpload.length;
    const totalFileCount = files.filesToUpload.length + files.filesCompleted.length;

    const onDownload = async () => {
        try {
            const fileHandle: FileSystemFileHandle = await (window as any).showSaveFilePicker();
            // props.onSetSaveResultsLocation(fileHandle);
        } catch (err) {
            // TODO: Decide where to present errors
            // props.onError((err as Error).message);
        }
    }

    if (isUploadComplete) {
        return (
            <>
                {props.errorLogs && (
                    <>
                        <h4>An error occurred while uploading, download the reults for details</h4>
                        <p>Choose the location to save the results of each file in the input CSV</p>
                        <SecondaryButton
                            className={styles.middleButton}
                            iconName="Download"
                            text="Download results"
                            title="Download results"
                            onClick={onDownload}
                        />
                    </>
                )}
                <p>UPLOAD COMPLETE YAY {totalFileCount} SYNCED WITH FMS</p>
                <SecondaryButton
                    className={styles.rightButton}
                    title="Upload more"
                    text="Upload more"
                    onClick={props.onCancel}
                />
            </>
        )
    }

    return (
        <>
            <h4>Upload in progress</h4>
            <p>{files?.filesCompleted.length}/{totalFileCount} files uploaded</p>
            {/* TODO: Maybe add an info block here saying they can close this IFF the uploads are past registration in FSS */}
            <SecondaryButton
                className={styles.rightButton}
                title="Cancel"
                text="Cancel"
                onClick={props.onCancel}
            />
        </>
    )
}