import { Icon, IconButton, TextField } from "@fluentui/react";
import classNames from "classnames";
import { throttle } from "lodash";
import * as React from "react";
import { useDropzone } from "react-dropzone";

import { SecondaryButton } from "../Buttons";
import Tooltip from "../Tooltip";
import { Source, getNameAndTypeFromSourceUrl } from "../../entity/SearchParams";

import styles from "./FilePrompt.module.css";

interface Props {
    className?: string;
    onSelectFile: (file?: Source) => void;
    selectedFile?: Source;
    parentId: string; // Distinguish between multiple file prompt elements
    lightBackground?: boolean;
}

/**
 * Component for asking a user for a file or URL
 */
export default function FilePrompt(props: Props) {
    const [dataSourceURL, setDataSourceURL] = React.useState("");
    const { onSelectFile } = props;

    const onDrop = React.useCallback(
        (acceptedFiles) => {
            const selectedFile = acceptedFiles?.[0];
            if (selectedFile) {
                // Grab name minus extension
                const nameAndExtension = selectedFile.name.split(".");
                const name = nameAndExtension.slice(0, -1).join("");
                const extension = nameAndExtension.pop();
                if (!(extension === "csv" || extension === "json" || extension === "parquet")) {
                    alert("Invalid file type. Please select a .csv, .json, or .parquet file.");
                    return;
                }

                onSelectFile({ name, type: extension, uri: selectedFile });
            }
        },
        [onSelectFile]
    );

    const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
        onDrop,
        accept: {
            "application/vnd.apache.parquet": [".parquet"],
            "application/json": [".json"],
            "text/csv": [".csv"],
        },
        multiple: false,
        noDragEventsBubbling: true,
    });

    // Format file rejection error codes into readable messages
    const fileErrorMessage: JSX.Element | JSX.Element[] | null = React.useMemo(() => {
        const fileRejectionMap = fileRejections.reduce((accum, { file, errors }) => {
            // Group together files that have the same error code
            errors.forEach((error) => {
                accum[error.code] = [...(accum[error.code as string] || []), file.name];
            });
            return accum;
        }, {} as { [errorCode: string]: string[] });

        // Convert an array of strings into a list with Oxford comma formatting
        const listFormatter = new Intl.ListFormat("en", { style: "long" });

        return Object.keys(fileRejectionMap).map((errorCode) => (
            <div className={styles.fileSelectionError} key={errorCode}>
                {listFormatter.format(fileRejectionMap[errorCode])} could not be selected:{" "}
                {errorCode === "too-many-files" ? "Too many files" : "Invalid file type"}.
            </div>
        ));
    }, [fileRejections]);

    const onEnterURL = throttle(
        (evt: React.FormEvent) => {
            evt.preventDefault();
            if (dataSourceURL) {
                props.onSelectFile({
                    ...getNameAndTypeFromSourceUrl(dataSourceURL),
                    uri: dataSourceURL,
                });
            }
        },
        10000,
        { leading: true, trailing: false }
    );

    if (props.selectedFile) {
        return (
            <div className={styles.selectedFileContainer}>
                <div className={styles.selectedFiles}>
                    <Tooltip content={props.selectedFile.name}>
                        <p className={styles.selectedFile}>
                            {props.selectedFile.name}.{props.selectedFile.type}
                        </p>
                    </Tooltip>
                    <IconButton
                        className={styles.selectedFileButton}
                        iconProps={{ iconName: "Cancel" }}
                        onClick={() => props.onSelectFile(undefined)}
                    />
                </div>
                {fileRejections.length > 0 && fileErrorMessage}
            </div>
        );
    }

    return (
        <div className={classNames(props.className, styles.actionsContainer)}>
            {fileRejections.length > 0 && fileErrorMessage}
            <form
                className={styles.urlForm}
                data-testid={`urlform-${props.parentId}`}
                onSubmit={onEnterURL}
            >
                <TextField
                    onChange={(_, newValue) => setDataSourceURL(newValue || "")}
                    placeholder="Paste URL (i.e. S3, Azure)..."
                    value={dataSourceURL}
                    iconProps={{
                        className: classNames(styles.cancelIcon, {
                            [styles.hidden]: !dataSourceURL,
                        }),
                        iconName: "Cancel",
                        onClick: () => {
                            dataSourceURL.length > 0 ? setDataSourceURL("") : undefined;
                        },
                    }}
                />
            </form>
            <div className={styles.orDivider}>OR</div>
            <div
                {...getRootProps({
                    "data-testid": "dropzone",
                    name: `data-source-selector-${props.parentId}`,
                    className: classNames(styles.dropzone, {
                        [styles.dropzoneDark]: props.lightBackground,
                        [styles.dropzoneActive]: isDragActive && !props.lightBackground,
                        [styles.dropzoneActiveDark]: isDragActive && props.lightBackground,
                    }),
                })}
            >
                <input
                    {...getInputProps({ name: `data-source-selector-input-${props.parentId}` })}
                />
                {isDragActive ? (
                    <p>Drop here</p>
                ) : (
                    <>
                        <p>
                            <Icon className={styles.dropzoneIcon} iconName="CloudUpload" /> Drag and
                            drop or click to browse
                        </p>
                        <SecondaryButton
                            className={styles.dropzoneButton}
                            iconName=""
                            text="Choose file"
                            title=""
                        />
                    </>
                )}
            </div>
        </div>
    );
}
