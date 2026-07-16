import { Icon, TextField } from "@fluentui/react";
import classNames from "classnames";
import { throttle } from "lodash";
import * as React from "react";
import { useDropzone } from "react-dropzone";
import { useSelector } from "react-redux";

import { SecondaryButton, TertiaryButton, TransparentIconButton } from "../Buttons";
import Tooltip from "../Tooltip";
import { Source, getNameAndTypeFromSourceUrl } from "../../entity/SearchParams";
import { interaction } from "../../state";

import styles from "./FilePrompt.module.css";

interface Props {
    className?: string;
    fileLabel?: string;
    lightBackground?: boolean;
    onSelectFile: (file?: Source) => void;
    parentId: string; // Distinguish between multiple file prompt elements
    selectedFile?: Source;
}

// Extra attributes on the directory-select input that aren't in React's typings.
// `webkitdirectory` is a Chromium/Safari extension; `directory` is the Firefox
// counterpart. Both are needed for cross-browser directory selection.
const directoryInputAttrs = {
    webkitdirectory: "",
    directory: "",
} as unknown as React.InputHTMLAttributes<HTMLInputElement>;

/**
 * Component for asking a user for a file or URL
 */
export default function FilePrompt(props: Props) {
    const [dataSourceURL, setDataSourceURL] = React.useState("");
    const [urlError, setUrlError] = React.useState<string | null>(null);
    const [isResolvingUrl, setIsResolvingUrl] = React.useState(false);
    const s3StorageService = useSelector(interaction.selectors.getS3StorageService);
    const directoryInputRef = React.useRef<HTMLInputElement>(null);
    const { onSelectFile } = props;

    const onDrop = React.useCallback(
        (acceptedFiles: File[]) => {
            if (!acceptedFiles?.length) return;

            // Multi-file drop: only makes sense when everything is a parquet shard.
            if (acceptedFiles.length > 1) {
                const allParquet = acceptedFiles.every((f) =>
                    f.name.toLowerCase().endsWith(".parquet")
                );
                if (allParquet) {
                    const directoryName =
                        // In a directory selection each File has a webkitRelativePath like "myDir/part.parquet".
                        (acceptedFiles[0] as File & { webkitRelativePath?: string })
                            .webkitRelativePath?.split("/")[0] || "parquet_directory";
                    onSelectFile({
                        name: directoryName,
                        type: "parquet",
                        uri: acceptedFiles[0],
                        shards: acceptedFiles,
                    });
                    return;
                }
            }

            const selectedFile = acceptedFiles[0];
            // Grab name minus extension
            const nameAndExtension = selectedFile.name.split(".");
            const name = nameAndExtension.slice(0, -1).join("");
            const extension = nameAndExtension.pop();
            onSelectFile({
                name,
                type: ["csv", "json", "parquet"].includes(extension ?? "")
                    ? (extension as "csv" | "json" | "parquet")
                    : "parquet",
                uri: selectedFile,
            });
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

    // A URL "looks like a directory" when it ends with a trailing slash, or its
    // last path segment has no dotted extension. Both cases are treated as
    // candidates for a sharded parquet directory and probed via S3 list.
    const looksLikeDirectory = (url: string) => {
        const trimmed = url.split("?")[0];
        if (trimmed.endsWith("/")) return true;
        const last = trimmed.substring(trimmed.lastIndexOf("/") + 1);
        return !last.includes(".");
    };

    const onEnterURL = throttle(
        async (evt?: React.FormEvent) => {
            evt?.preventDefault();
            if (!dataSourceURL) return;

            const nameAndType = getNameAndTypeFromSourceUrl(dataSourceURL);

            if (nameAndType.type === "parquet" && looksLikeDirectory(dataSourceURL)) {
                setUrlError(null);
                setIsResolvingUrl(true);
                try {
                    const shards = await s3StorageService.listParquetShards(dataSourceURL);
                    if (!shards) {
                        setUrlError(
                            "Could not list objects at that URL. Confirm the path is a public S3 directory."
                        );
                        return;
                    }
                    if (shards.length === 0) {
                        setUrlError("No .parquet files found at that URL.");
                        return;
                    }
                    onSelectFile({
                        ...nameAndType,
                        uri: dataSourceURL,
                        shards,
                    });
                } finally {
                    setIsResolvingUrl(false);
                }
                return;
            }

            setUrlError(null);
            onSelectFile({
                ...nameAndType,
                uri: dataSourceURL,
            });
        },
        10000,
        { leading: true, trailing: false }
    );

    const onDirectoryChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
        const files = evt.target.files;
        if (!files || files.length === 0) return;
        onDrop(Array.from(files));
        // Reset so re-selecting the same directory refires onChange
        evt.target.value = "";
    };

    if (props.selectedFile) {
        return (
            <div className={styles.selectedFileContainer}>
                <div className={styles.selectedFiles}>
                    <Tooltip content={props.selectedFile.name}>
                        <p className={styles.selectedFile}>
                            {props?.fileLabel}
                            {props.selectedFile.name}.{props.selectedFile.type}
                        </p>
                    </Tooltip>
                    <TransparentIconButton
                        className={styles.selectedFileButton}
                        iconName="Cancel"
                        title="Remove file"
                        onClick={() => props.onSelectFile(undefined)}
                    />
                </div>
                {fileRejections.length > 0 && fileErrorMessage}
            </div>
        );
    }

    return (
        <div className={classNames(props.className, styles.actionsContainer)}>
            <form
                className={styles.urlForm}
                data-testid={`urlform-${props.parentId}`}
                onSubmit={onEnterURL}
            >
                <TextField
                    iconProps={{
                        className: classNames(styles.cancelIcon, {
                            [styles.hidden]: !dataSourceURL,
                        }),
                        iconName: "Cancel",
                        onClick: () => {
                            dataSourceURL.length > 0 ? setDataSourceURL("") : undefined;
                        },
                    }}
                    onChange={(_, newValue) => {
                        setDataSourceURL(newValue || "");
                        if (urlError) setUrlError(null);
                    }}
                    placeholder="Paste URL (i.e. S3, Azure)..."
                    value={dataSourceURL}
                />
                <TertiaryButton
                    className={styles.enterButton}
                    disabled={!dataSourceURL || isResolvingUrl}
                    iconName={isResolvingUrl ? "Sync" : "ReturnKey"}
                    onClick={() => onEnterURL()}
                    title={isResolvingUrl ? "Resolving..." : "Select URL"}
                />
            </form>
            {urlError && <div className={styles.fileSelectionError}>{urlError}</div>}
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
                            <Icon className={styles.dropzoneIcon} iconName="CloudUpload" />
                            Drag and drop or click to browse
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
            <input
                ref={directoryInputRef}
                type="file"
                {...directoryInputAttrs}
                style={{ display: "none" }}
                onChange={onDirectoryChange}
                data-testid={`directory-input-${props.parentId}`}
            />
            <TertiaryButton
                className={styles.dropzoneButton}
                iconName="FolderOpen"
                text="Choose parquet directory"
                title="Select a local directory containing sharded parquet files"
                onClick={() => directoryInputRef.current?.click()}
            />
            {fileRejections.length > 0 && fileErrorMessage}
        </div>
    );
}
