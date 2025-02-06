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
 * Table component for rendering file details.
 */
function FileTable({ files, title }: { files: FileDetail[]; title: string }) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [hasScroll, setHasScroll] = React.useState(false);

    React.useEffect(() => {
        const checkScroll = () => {
            if (containerRef.current) {
                const isScrollable =
                    containerRef.current.scrollHeight > containerRef.current.clientHeight;
                setHasScroll(isScrollable);
            }
        };
        checkScroll(); // Initial check
        window.addEventListener("resize", checkScroll);
        return () => window.removeEventListener("resize", checkScroll);
    }, [files]);

    const clipFileName = (filename: string) => {
        if (filename.length > 20) {
            return filename.slice(0, 9) + "..." + filename.slice(-8);
        }
        return filename;
    };

    const calculateTotalSize = (files: FileDetail[]) => {
        const totalBytes = files.reduce((acc, file) => acc + (file.size || 0), 0);
        return totalBytes ? filesize(totalBytes) : "Calculating...";
    };

    return (
        <div className={styles.tableContainer}>
            <h3 className={styles.tableTitle}>{title}</h3>
            <div className={styles.tableWrapper}>
                <div
                    ref={containerRef}
                    className={`${styles.fileTableContainer} ${hasScroll ? styles.hasScroll : ""}`}
                >
                    <table className={styles.fileTable}>
                        <thead>
                            <tr>
                                <th>File Name</th>
                                <th>File Size</th>
                            </tr>
                        </thead>
                        <tbody>
                            {files.map((file, index) => (
                                <tr key={file.id || index}>
                                    <td>{clipFileName(file.name)}</td>
                                    <td>{filesize(file.size || 0)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {hasScroll && <div className={styles.gradientOverlay} />}
            </div>
            <div className={styles.summary}>
                <span className={styles.totalSize}>{calculateTotalSize(files)}</span>
                <span className={styles.fileCount}>{files.length.toLocaleString()} files</span>
            </div>
        </div>
    );
}

/**
 * Modal overlay for displaying details of selected files for NAS cache (VAST) operations.
 */
export default function CopyFileManifest({ onDismiss }: ModalProps) {
    const dispatch = useDispatch();
    const fileSelection = useSelector(
        selection.selectors.getFileSelection,
        FileSelection.selectionsAreEqual
    );

    const [fileDetails, setFileDetails] = React.useState<FileDetail[]>([]);
    const [loading, setLoading] = React.useState<boolean>(true);

    React.useEffect(() => {
        async function fetchFiles() {
            try {
                const details = await fileSelection.fetchAllDetails();
                setFileDetails(details);
            } catch (err: any) {
                throw new Error(err.message || "Error fetching file details.");
            } finally {
                setLoading(false);
            }
        }
        fetchFiles();
    }, [fileSelection]);

    const onMove = () => {
        dispatch(interaction.actions.copyFiles(fileDetails));
        onDismiss();
    };

    const filesInLocalCache = fileDetails.filter((file) =>
        file.annotations.some(
            (annotation) =>
                annotation.name === "Should Be in Local Cache" && annotation.values[0] === true
        )
    );

    const filesNotInLocalCache = fileDetails.filter(
        (file) =>
            file.annotations.some(
                (annotation) =>
                    annotation.name === "Should Be in Local Cache" && annotation.values[0] === false
            ) ||
            !file.annotations.some((annotation) => annotation.name === "Should Be in Local Cache")
    );

    return (
        <BaseModal
            title="Copy files to local storage (VAST)"
            onDismiss={onDismiss}
            body={
                <div className={styles.bodyContainer}>
                    {loading && (
                        <div className={styles.loading}>
                            <p>Loading file details...</p>
                        </div>
                    )}
                    {!loading && (
                        <>
                            <p className={styles.note}>
                                Files copied to the local storage (VAST) are stored with a 180-day
                                expiration, after which they revert to cloud-only storage. To extend
                                the expiration, reselect the files and confirm the update.
                            </p>
                            {filesInLocalCache.length > 0 && (
                                <FileTable
                                    files={filesInLocalCache}
                                    title="Files that are already on VAST: Extend expiration"
                                />
                            )}
                            {filesNotInLocalCache.length > 0 && (
                                <FileTable
                                    files={filesNotInLocalCache}
                                    title="Files to download to VAST"
                                />
                            )}
                        </>
                    )}
                </div>
            }
            footer={
                <div className={styles.footerButtons}>
                    <SecondaryButton
                        className={styles.cancelButton}
                        onClick={onDismiss}
                        text="CANCEL"
                        title=""
                    />
                    <PrimaryButton
                        className={styles.confirmButton}
                        disabled={loading || fileDetails.length === 0}
                        onClick={onMove}
                        text="CONFIRM"
                        title=""
                    />
                </div>
            }
        />
    );
}
