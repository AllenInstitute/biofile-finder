import { IconButton, TextField } from "@fluentui/react";
import classNames from "classnames";
import { throttle } from "lodash";
import * as React from "react";

import { SecondaryButton } from "../Buttons";
import Tooltip from "../Tooltip";
import { Source, getNameAndTypeFromSourceUrl } from "../../entity/SearchParams";

import styles from "./FilePrompt.module.css";

interface Props {
    className?: string;
    onSelectFile: (file?: Source) => void;
    selectedFile?: Source;
}

/**
 * Component for asking a user for a file or URL
 */
export default function FilePrompt(props: Props) {
    const [dataSourceURL, setDataSourceURL] = React.useState("");

    const onChooseFile = (evt: React.FormEvent<HTMLInputElement>) => {
        const selectedFile = (evt.target as HTMLInputElement).files?.[0];
        if (selectedFile) {
            // Grab name minus extension
            const nameAndExtension = selectedFile.name.split(".");
            const name = nameAndExtension.slice(0, -1).join("");
            const extension = nameAndExtension.pop();
            if (!(extension === "csv" || extension === "json" || extension === "parquet")) {
                alert("Invalid file type. Please select a .csv, .json, or .parquet file.");
                return;
            }

            props.onSelectFile({ name, type: extension, uri: selectedFile });
        }
    };
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
        );
    }

    return (
        <div className={classNames(props.className, styles.actionsContainer)}>
            <form>
                <label
                    aria-label="Browse for a file on your machine"
                    title="Browse for a file on your machine"
                    htmlFor="data-source-selector"
                >
                    <SecondaryButton
                        iconName="DocumentSearch"
                        text="Choose file"
                        title="Choose file"
                    />
                </label>
                <input
                    hidden
                    accept=".csv,.json,.parquet"
                    type="file"
                    id="data-source-selector"
                    name="data-source-selector"
                    onChange={onChooseFile}
                />
            </form>
            <div className={styles.orDivider}>OR</div>
            <form className={styles.urlForm} onSubmit={onEnterURL}>
                <TextField
                    onChange={(_, newValue) => setDataSourceURL(newValue || "")}
                    placeholder="Paste URL (ex. S3, Azure)..."
                    iconProps={{
                        className: classNames(styles.submitIcon, {
                            [styles.disabled]: !dataSourceURL,
                        }),
                        iconName: "ReturnKey",
                        onClick: dataSourceURL ? onEnterURL : undefined,
                    }}
                    value={dataSourceURL}
                />
            </form>
        </div>
    );
}
