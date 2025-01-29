import { chunk } from "lodash";
import * as React from "react";

import Upload, { Files } from "../Upload";
import UploadPrompt from "../UploadPrompt";
import FileManagementService from "../../../../services/FileManagementService";

import styles from "./DirectoryInput.module.css";

/**
 * TODO
 */
export default function DirectoryInput() {
    const fileManagementService = new FileManagementService();

    const [files, setFiles] = React.useState<any[]>([]);
    const [uploadedFileNames, setUploadedFileNames] = React.useState<string[]>([]);
    const [errorLogs, setErrorLogs] = React.useState<{ filePath: string, error: Error, }[]>();
    const [isUploading, setIsUploading] = React.useState(false);
    const [isLocalInclusiveUpload, onSetIsLocalInclusiveUpload] = React.useState(false);

    // const uploadedFiles = React.useMemo(() => (

    // ), [files, uploadedFileNames]);

    const uploadFiles = async (filePaths: any[]) => {
        const errorLogs: { filePath: any, error: Error }[] = [];
        for (const fileBatch of chunk(filePaths, 5)) {
            await Promise.all(fileBatch.map(async (filePath) => {
                try {
                    await fileManagementService.upload(filePath, isLocalInclusiveUpload);
                    
                } catch (error) {
                    console.error(`Error updating file ${filePath}:`, error);
                    errorLogs.push({ filePath, error: error as Error });
                }
            }));
        }
        return errorLogs;
    }

    const onUpload = async () => {
        if (!files) {
            return;
        }

        setIsUploading(true);

        // Upload files
        const errorLogs = await uploadFiles(files.filesToUpload);

        setTimeout(() => {
            setFiles({ filesToUpload: [], filesCompleted: [0] });
        }, 10000)

        setIsUploading(false);
        setErrorLogs(errorLogs);
    }

    const onCancelUpload = () => {
        setFiles(undefined);
        setIsUploading(false);
    }

    return (
        <div>
            <h1>Upload Files</h1>

            {(isUploading && files) ? (
                <Upload
                    files={files}
                    errorLogs={errorLogs}
                    onCancel={onCancelUpload}
                />
            ) : (
                <UploadPrompt
                    files={files}
                    onUpload={onUpload}
                    setFiles={setFiles}
                    isLocalInclusiveUpload={isLocalInclusiveUpload}
                    onSetIsLocalInclusiveUpload={onSetIsLocalInclusiveUpload}
                />
            )}
        </div>
    )
}
