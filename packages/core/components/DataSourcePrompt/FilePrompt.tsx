import { Icon, TextField } from "@fluentui/react";
import classNames from "classnames";
import { throttle } from "lodash";
import * as React from "react";
import { useDropzone } from "react-dropzone";
import { useDispatch } from "react-redux";

import MarkdownPreview from "./MarkdownPreview";
import { TertiaryButton, TransparentIconButton } from "../Buttons";
import Tooltip from "../Tooltip";
import { ParsedFrontmatter, processMarkdown } from "../../entity/MarkdownFrontMatter";
import {
    getNameFromSourceUrl,
    getResourceNameFromSourceUrl,
    isMarkdownType,
    Source,
} from "../../entity/SearchParams";
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

// Selectors for the controls focus is handed to when this component swaps its contents
const REMOVE_BUTTON_SELECTOR = "button";
const URL_INPUT_SELECTOR = "input[type=text]";

function focusWithin(container: HTMLElement | null, selector: string) {
    container?.querySelector<HTMLElement>(selector)?.focus();
}

/**
 * Component for asking a user for a file or URL
 */
export default function FilePrompt(props: Props) {
    const dispatch = useDispatch();
    const [dataSourceURL, setDataSourceURL] = React.useState("");
    const [mdFrontmatter, setMdFrontmatter] = React.useState<ParsedFrontmatter>();
    const [shouldHaveFrontmatter, setShouldHaveFrontmatter] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const hasMounted = React.useRef(false);
    const { onSelectFile } = props;
    const hasSelectedFile = !!props.selectedFile;

    // This component swaps its contents when a file is selected or removed, which
    // would otherwise drop keyboard focus onto the body
    React.useEffect(() => {
        if (hasSelectedFile) {
            focusWithin(containerRef.current, REMOVE_BUTTON_SELECTOR);
        } else if (hasMounted.current) {
            focusWithin(containerRef.current, URL_INPUT_SELECTOR);
        }
        hasMounted.current = true;
    }, [hasSelectedFile]);

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
        const fileRejectionMap = fileRejections.reduce(
            (accum, { file, errors }) => {
                // Group together files that have the same error code
                errors.forEach((error) => {
                    accum[error.code] = [...(accum[error.code as string] || []), file.name];
                });
                return accum;
            },
            {} as { [errorCode: string]: string[] }
        );

        // Convert an array of strings into a list with Oxford comma formatting
        const listFormatter = new Intl.ListFormat("en", { style: "long" });

        return Object.keys(fileRejectionMap).map((errorCode) => (
            <div className={styles.fileSelectionError} key={errorCode} role="alert">
                {listFormatter.format(fileRejectionMap[errorCode])} could not be selected:{" "}
                {errorCode === "too-many-files" ? "Too many files" : "Invalid file type"}.
            </div>
        ));
    }, [fileRejections]);

    const clearURL = () => setDataSourceURL("");

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
            <div className={styles.selectedFileContainer} ref={containerRef}>
                <div className={styles.selectedFiles}>
                    <Tooltip content={`${props.selectedFile.name}.${props.selectedFile.type}`}>
                        <p className={styles.selectedFile}>
                            {props?.fileLabel}
                            {props.selectedFile.name}
                        </p>
                    </Tooltip>
                    <TransparentIconButton
                        className={styles.selectedFileButton}
                        iconName="Cancel"
                        label="Remove file"
                        onClick={() => props.onSelectFile(undefined)}
                    />
                </div>
                <div role="status">
                    {shouldHaveFrontmatter && <MarkdownPreview mdFrontmatter={mdFrontmatter} />}
                </div>
                {fileRejections.length > 0 && fileErrorMessage}
            </div>
        );
    }

    return (
        <div className={classNames(props.className, styles.actionsContainer)} ref={containerRef}>
            <div className={styles.options}>
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
                            onClick: clearURL,
                            onKeyDown: (evt: React.KeyboardEvent) => {
                                if (evt.key === "Enter" || evt.key === " ") {
                                    evt.preventDefault();
                                    clearURL();
                                }
                            },
                            role: "button",
                            tabIndex: 0,
                            "aria-label": "Clear URL",
                        }}
                        ariaLabel="Data source URL"
                        onChange={(_, newValue) => setDataSourceURL(newValue || "")}
                        placeholder="Paste URL (i.e. S3, Azure, Google Sheets)..."
                        value={dataSourceURL}
                    />
                    <TertiaryButton
                        className={styles.enterButton}
                        disabled={!dataSourceURL}
                        iconName="ReturnKey"
                        onClick={() => onEnterURL()}
                        title="Apply URL"
                    />
                </form>
                <div className={styles.orDivider}>OR</div>
                <div
                    {...getRootProps({
                        "data-testid": "dropzone",
                        name: `data-source-selector-${props.parentId}`,
                        role: "button",
                        "aria-label": "Browse for a file, or drag and drop one here",
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
                        <p>
                            <Icon className={styles.dropzoneIcon} iconName="Move" />
                            Drag and drop or <span className={styles.browseLink}>browse</span>
                        </p>
                    )}
                </div>
            </div>
            {fileRejections.length > 0 && fileErrorMessage}
        </div>
    );
}
