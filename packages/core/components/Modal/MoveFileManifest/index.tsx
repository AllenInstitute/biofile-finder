import filesize from "filesize";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import { PrimaryButton } from "../../Buttons";
import FileDetail from "../../../entity/FileDetail";
import FileSelection from "../../../entity/FileSelection";
import { interaction, selection } from "../../../state";

import styles from "./MoveFileManifest.module.css";

/**
 * Modal overlay for displaying details of selected files for NAS cache operations.
 */
export default function MoveFileManifest({ onDismiss }: ModalProps) {
    const dispatch = useDispatch();
    const fileService = useSelector(interaction.selectors.getFileService);
    const fileSelection = useSelector(
        selection.selectors.getFileSelection,
        FileSelection.selectionsAreEqual
    );
    const moveFileTarget = useSelector(interaction.selectors.getMoveFileTarget);

    const [fileDetails, setFileDetails] = React.useState<FileDetail[]>([]);
    const [totalSize, setTotalSize] = React.useState<string | undefined>();
    const [isLoading, setLoading] = React.useState(false);

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

    const onMove = () => {
        if (moveFileTarget) {
            dispatch(interaction.actions.moveFiles(fileDetails, moveFileTarget));
            onDismiss();
        } else {
            console.warn(
                "Move file target location is undefined. Cannot proceed with moving files."
            );
        }
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
                                <td>{filesize(file.size || 0)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p>Total Files: {fileDetails.length}</p>
            <p>Total Size: {isLoading ? "Loading..." : totalSize}</p>
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
            title={`Move Files to ${moveFileTarget}`}
        />
    );
}
