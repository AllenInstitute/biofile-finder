import { Icon, TextField } from "@fluentui/react";
import classNames from "classnames";
import { throttle } from "lodash";
import * as React from "react";
import { useDropzone } from "react-dropzone";
import { useDispatch } from "react-redux";

import MarkdownPreview from "./MarkdownPreview";
import { SecondaryButton, TertiaryButton, TransparentIconButton } from "../Buttons";
import Tooltip from "../Tooltip";
import {
    Source,
    getNameFromSourceUrl,
    getResourceNameFromSourceUrl,
    isMarkdownType,
} from "../../entity/SearchParams";
import { ParsedFrontmatter, processMarkdown } from "../../entity/MarkdownFrontMatter";
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

/**
 * Component for asking a user for a file or URL
 */
export default function FilePrompt(props: Props) {
    const dispatch = useDispatch();
    const [dataSourceURL, setDataSourceURL] = React.useState("");
    const [mdFrontmatter, setMdFrontmatter] = React.useState<ParsedFrontmatter>();
    const [shouldHaveFrontmatter, setShouldHaveFrontmatter] = React.useState(false);
    const { onSelectFile } = props;

    // Parse markdown files to provide a preview of the metadata we're able to find.
    const handleMarkdownSource = React.useCallback(
        (source: Source, extension?: string) => {
            if (isMarkdownType(extension)) {
                // Calls the standalone process instead of going through the DB service
                // since we don't want to cache the result yet
                processMarkdown(source, false) // skip source normalization since just previewing the data
                    .then((result) => {
                        setMdFrontmatter(result);
                    })
                    .catch((e) => {
                        setMdFrontmatter(undefined);
                        dispatch(
                            interaction.actions.processError(source.name, (e as Error).message)
                        );
                    });
                setShouldHaveFrontmatter(true);
            } else {
                setMdFrontmatter(undefined);
                setShouldHaveFrontmatter(false);
            }
        },
        [dispatch]
    );

    const onDrop = React.useCallback(
        (acceptedFiles) => {
            const selectedFile = acceptedFiles?.[0];
            if (selectedFile) {
                // Grab name minus extension
                const segments = selectedFile.name.split(".");
                const name = segments.length > 1 ? segments.slice(0, -1).join(".") : segments[0];
                // Extension validation is handled by the component itself
                const source = { name, uri: selectedFile };
                onSelectFile(source);
                handleMarkdownSource(source, segments.length > 1 ? segments.pop() : undefined);
            }
        },
        [onSelectFile, handleMarkdownSource]
    );

    const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
        onDrop,
        accept: {
            "application/vnd.apache.parquet": [".parquet"],
            "application/json": [".json"],
            "text/csv": [".csv"],
            "text/markdown": [".md", ".markdown"],
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
        (evt?: React.FormEvent) => {
            evt?.preventDefault();
            if (dataSourceURL) {
                const source = {
                    name: getNameFromSourceUrl(dataSourceURL),
                    uri: dataSourceURL,
                };
                props.onSelectFile(source);
                handleMarkdownSource(
                    source,
                    getResourceNameFromSourceUrl(dataSourceURL).split(".").pop()
                );
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
                            {props?.fileLabel}
                            {props.selectedFile.name}
                        </p>
                    </Tooltip>
                    <TransparentIconButton
                        className={styles.selectedFileButton}
                        iconName="Cancel"
                        title="Remove file"
                        onClick={() => props.onSelectFile(undefined)}
                    />
                </div>
                {shouldHaveFrontmatter && <MarkdownPreview mdFrontmatter={mdFrontmatter} />}
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
                    onChange={(_, newValue) => setDataSourceURL(newValue || "")}
                    placeholder="Paste URL (i.e. S3, Azure)..."
                    value={dataSourceURL}
                />
                <TertiaryButton
                    className={styles.enterButton}
                    disabled={!dataSourceURL}
                    iconName="ReturnKey"
                    onClick={() => onEnterURL()}
                    title="Select URL"
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
            {fileRejections.length > 0 && fileErrorMessage}
        </div>
    );
}
