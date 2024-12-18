import filesize from "filesize";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import { PrimaryButton, SecondaryButton } from "../../Buttons";
import FileDetail from "../../../entity/FileDetail";
import FileSelection from "../../../entity/FileSelection";
import { interaction, selection } from "../../../state";

import styles from "./CopyFileManifest.module.css";

/**
 * Modal overlay for displaying details of selected files for NAS cache operations.
 */
export default function CopyFileManifest({ onDismiss }: ModalProps) {
    const dispatch = useDispatch();
    const fileService = useSelector(interaction.selectors.getFileService);
    const fileSelection = useSelector(
        selection.selectors.getFileSelection,
        FileSelection.selectionsAreEqual
    );

    const [fileDetails, setFileDetails] = React.useState<FileDetail[]>([]);
    const [totalSize, setTotalSize] = React.useState<string | undefined>();
    const [isLoading, setLoading] = React.useState(false);

    // Utility function to clip file names
    const clipFileName = (filename: string) => {
        if (filename.length > 20) {
            return filename.slice(0, 9) + "..." + filename.slice(-8);
        }
        return filename;
    };

    React.useEffect(() => {
        async function fetchDetails() {
            setLoading(true);
            const details = await fileSelection.fetchAllDetails();
            setFileDetails(details);

            const aggregateInfo = await fileService.getAggregateInformation(fileSelection);
            const formattedSize = aggregateInfo.size ? filesize(aggregateInfo.size) : undefined;
            setTotalSize(formattedSize);
            setLoading(false);
        }

        fetchDetails();
    }, [fileSelection, fileService]);

    // Handler for moving files to NAS cache
    const onMove = () => {
        dispatch(interaction.actions.copyFiles(fileDetails));
        onDismiss();
    };

    // Separate files by "Should Be in Local Cache"
    const filesInLocalCache = fileDetails.filter((file) =>
        file.annotations.some(
            (annotation) =>
                annotation.name === "Should Be in Local Cache" && annotation.values[0] === true
        )
    );

    const filesNotInLocalCache = fileDetails.filter((file) =>
        file.annotations.some(
            (annotation) =>
                annotation.name === "Should Be in Local Cache" && annotation.values[0] === false
        )
    );

    // Reusable function to render a table for files
    const renderTable = (files: FileDetail[], title: string) => (
        <div>
            <h3 className={styles.tableTitle}>{title}</h3>
            <div className={styles.fileTableContainer}>
                <table className={styles.fileTable}>
                    <thead>
                        <tr>
                            <th>File Name</th>
                            <th>File Size</th>
                        </tr>
                    </thead>
                    <tbody>
                        {files.map((file) => (
                            <tr key={file.id}>
                                <td>{clipFileName(file.name)}</td>
                                <td>{filesize(file.size || 0)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const body = (
        <div className={styles.bodyContainer}>
            <p className={styles.note}>
                Files copied to the local NAS (Vast) are stored with a 180-day expiration, after
                which they revert to cloud-only. To extend the expiration, simply reselect the files
                and confirm the update.
            </p>
            {renderTable(filesInLocalCache, "Files that are already on Vast: Extend expiration")}
            {renderTable(filesNotInLocalCache, "Files to download to Vast")}
            <div className={styles.summary}>
                <span className={styles.totalSize}>
                    {isLoading ? "Calculating..." : totalSize || "0 B"}
                </span>
                <span className={styles.fileCount}>
                    {fileDetails.length.toLocaleString()} files
                </span>
            </div>
        </div>
    );

    return (
        <BaseModal
            body={body}
            footer={
                <div className={styles.footerButtons}>
                    <PrimaryButton
                        className={styles.confirmButton}
                        disabled={!fileDetails.length}
                        onClick={onMove}
                        text="CONFIRM"
                        title=""
                    />
                    <SecondaryButton
                        className={styles.cancelButton}
                        onClick={onDismiss}
                        text="CANCEL"
                        title=""
                    />
                </div>
            }
            onDismiss={onDismiss}
            title="Copy Files to Local NAS (Vast)"
        />
    );
}
