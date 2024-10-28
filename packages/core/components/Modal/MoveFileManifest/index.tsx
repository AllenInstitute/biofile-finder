import * as React from "react";
import { useSelector } from "react-redux";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import { PrimaryButton } from "../../Buttons";
import { interaction, selection } from "../../../state";
import FileDetail from "../../../entity/FileDetail";
import styles from "./MoveFileManifest.module.css";
import FileSelection from "../../../entity/FileSelection";

/**
 * Modal overlay for displaying details of selected files for NAS cache operations.
 */
export default function MoveFileManifest({ onDismiss }: ModalProps) {
    // const dispatch = useDispatch(); //TODO: add onMove functionality
    const fileSelection = useSelector(
        selection.selectors.getFileSelection,
        FileSelection.selectionsAreEqual
    );
    const moveFileTarget = useSelector(interaction.selectors.getMoveFileTarget);

    const [fileDetails, setFileDetails] = React.useState<FileDetail[]>([]);
    const [totalSize, setTotalSize] = React.useState<number>(0);

    React.useEffect(() => {
        async function fetchDetails() {
            const details = await fileSelection.fetchAllDetails();
            setFileDetails(details);
            const totalFileSize = details.reduce((acc, file) => acc + (file.size || 0), 0);
            setTotalSize(totalFileSize);
        }

        fetchDetails();
    }, [fileSelection]);

    const onMove = () => {
        console.log(
            `Moving ${fileDetails.length} files ${
                moveFileTarget === "ON_TO_NAS" ? "onto" : "off of"
            } NAS.`
        );
        onDismiss();
    };

    const body = (
        <div>
            <p>Selected Files:</p>
            <div className={styles.fileTableContainer}>
                <table className={styles.fileTable}>
                    <thead>
                        <tr>
                            <th>File Name</th>
                            <th>File Size</th>
                        </tr>
                    </thead>
                    <tbody>
                        {fileDetails.map((file) => (
                            <tr key={file.id}>
                                <td>{file.name}</td>
                                <td>{formatFileSize(file.size || 0)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p>Total Files: {fileDetails.length}</p>
            <p>Total Size: {formatFileSize(totalSize)}</p>
        </div>
    );

    return (
        <BaseModal
            body={body}
            footer={
                <PrimaryButton
                    className={styles.confirmButton}
                    disabled={!fileDetails.length}
                    iconName="Accept"
                    onClick={onMove}
                    text="CONFIRM"
                    title="Confirm"
                />
            }
            onDismiss={onDismiss}
            title={`Move Files ${moveFileTarget === "ON_TO_NAS" ? "onto" : "off of"} NAS Cache`}
        />
    );
}

/**
 * Formats a file size to a human-readable string.
 */
const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    const units = ["KB", "MB", "GB", "TB"];
    let unitIndex = -1;
    let formattedSize = size;

    do {
        formattedSize /= 1024;
        unitIndex++;
    } while (formattedSize >= 1024 && unitIndex < units.length - 1);

    return `${formattedSize.toFixed(2)} ${units[unitIndex]}`;
};
