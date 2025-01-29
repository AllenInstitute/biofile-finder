import * as React from "react";

import { Files } from "../Upload";
import { SecondaryButton } from "../../../Buttons";

import styles from "./InputPreview.module.css";

interface Props {
    files: Files;
    onCancel: () => void;
}

/**
 * TODO
 */
export default function InputPreview(props: Props) {
    const { files: { filesCompleted, filesToUpload, filesToUpdate } } = props;
    return (
        <div className={styles.container}>
            <SecondaryButton
                className={styles.rightButton}
                title="Delete"
                text="X"
                onClick={() => {
                    props.onCancel();
                }}
            />
            <h3>Preview of files</h3>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>File Name</th>
                        <th>Is Uploaded to FMS</th>
                        <th>Is Metadata Synced to FMS</th>
                    </tr>
                </thead>
                <tbody>
                    {filesToUpload.map((file) => (
                        <tr key={file}>
                            <td>{file}</td>
                            <td>False</td>
                            <td>False</td>
                        </tr>
                    ))}
                    {filesToUpdate.map((file) => (
                        <tr key={file}>
                            <td>{file}</td>
                            <td>True</td>
                            <td>False</td>
                        </tr>
                    ))}
                    {filesCompleted.map((file) => (
                        <tr key={file}>
                            <td>{file}</td>
                            <td>True</td>
                            <td>True</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
