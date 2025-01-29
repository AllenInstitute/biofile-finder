import * as React from "react";

import InputPrompt from "./InputPrompt";
import InputPreview from "./InputPreview";
import { Files } from "../Upload";
import { SecondaryButton } from "../../../Buttons";

import styles from "./UploadPrompt.module.css";
import Checkbox from "../../../Checkbox";

interface Props {
    files?: Files;
    saveResultsLocation?: FileSystemFileHandle;
    isLocalInclusiveUpload: boolean;
    onUpload: () => void;
    setFiles: (files?: Files) => void;
    onSetIsLocalInclusiveUpload: (shouldBeInLocal: boolean) => void;
}

/**
 * TODO
 */
export default function UploadPrompt(props: Props) {
    return (
        <div>
            <h3>Instructions</h3>
            <p>
                Upload files and sync metadata with FMS by providing a .csv similar to the example one below
                where each column represents a metadata tag and each row represents a file. The first row should
                contain metadata tags, and each subsequent row include metadata for a file, with &quot;File Path&quot; being
                the only required column.
            </p>
            <h3>Example Input</h3>
            <table className={styles.table}>
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

            <h2>Select CSV</h2>
            <p>Choose a CSV containing references to files to upload and metadata about those files</p>
            {props.files ? (
                <InputPreview
                    files={props.files}
                    onCancel={() => {
                        props.setFiles(undefined);
                    }}
                />
            ) : (
                <InputPrompt
                    onSelectInput={props.setFiles}
                />
            )}

            <Checkbox
                label="Should be in local"
                onChange={() => props.onSetIsLocalInclusiveUpload(!props.isLocalInclusiveUpload)}
            />

            <SecondaryButton
                className={styles.rightButton}
                title="Upload"
                text="Upload"
                disabled={!props.files?.filesToUpdate.length && !props.files?.filesToUpload.length}
                onClick={() => {
                    props.onUpload();
                }}
            />
        </div>
    )
}
