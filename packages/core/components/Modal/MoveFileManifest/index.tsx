import filesize from "filesize";
import * as React from "react";
import { useSelector } from "react-redux";

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
    // const dispatch = useDispatch(); //TODO: add onMove functionality
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
            title={`Move Files ${moveFileTarget === "ON_TO_NAS" ? "onto" : "off of"} NAS Cache`}
        />
    );
}
