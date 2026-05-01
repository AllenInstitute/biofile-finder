import { Icon } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import BrowserPanel from "./BrowserPanel";
import PythonPanel, { isInvalidRegex } from "./PythonPanel";
import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import { SecondaryButton } from "../../Buttons";

import styles from "./GenerateDataSource.module.css";

type Mode = "python" | "browser";

// TODO: IMPORTANT this should reference the documentation section on metadata guidance
// once the user guide is merged in

/**
 * Generates a data source in two ways:
 *
 * 1. **Parse Folder in Browser** – user selects a local folder; the app reads the file paths,
 *    applies an optional regex to extract metadata, and downloads a CSV immediately.
 *
 * 2. **Python Script** – generates ready-to-run Python that inventories a folder and produces
 *    a CSV/Parquet/JSON for use in BioFile Finder.
 */
export default function GenerateDataSource({ onDismiss }: ModalProps) {
    const [mode, setMode] = React.useState<Mode>("browser");

    // ---- Shared settings (lifted so they persist across tab switches) ----
    const [filePattern, setFilePattern] = React.useState("**/*");
    const [pathRegex, setPathRegex] = React.useState("");
    const [outputFile, setOutputFile] = React.useState("inventory.csv");

    const regexError = React.useMemo(() => {
        if (!pathRegex) return undefined;
        return isInvalidRegex(pathRegex) ? "Invalid regular expression" : undefined;
    }, [pathRegex]);

    // ---- Modal body ----
    const body = (
        <div className={styles.shell}>
            {/* Mode switcher */}
            <div className={styles.modeSwitcher}>
                <button
                    className={classNames(styles.modeTab, {
                        [styles.modeTabActive]: mode === "browser",
                    })}
                    onClick={() => setMode("browser")}
                    type="button"
                >
                    <Icon iconName="FolderOpen" className={styles.modeTabIcon} />
                    Parse folder in browser
                </button>
                <button
                    className={classNames(styles.modeTab, {
                        [styles.modeTabActive]: mode === "python",
                    })}
                    onClick={() => setMode("python")}
                    type="button"
                >
                    <Icon iconName="Code" className={styles.modeTabIcon} />
                    Generate Python script
                </button>
            </div>

            <div className={styles.columns}>
                {mode === "browser" ? (
                    <BrowserPanel
                        filePattern={filePattern}
                        onFilePatternChange={setFilePattern}
                        pathRegex={pathRegex}
                        onPathRegexChange={setPathRegex}
                        regexError={regexError}
                        outputFile={outputFile}
                        onOutputFileChange={setOutputFile}
                    />
                ) : (
                    <PythonPanel
                        filePattern={filePattern}
                        onFilePatternChange={setFilePattern}
                        pathRegex={pathRegex}
                        onPathRegexChange={setPathRegex}
                        regexError={regexError}
                        outputFile={outputFile}
                        onOutputFileChange={setOutputFile}
                    />
                )}
            </div>
        </div>
    );

    const footer = (
        <div className={styles.footerButtons}>
            <SecondaryButton className={styles.closeButton} onClick={onDismiss} text="CLOSE" />
        </div>
    );

    return (
        <BaseModal
            body={body}
            footer={footer}
            isStatic
            onDismiss={onDismiss}
            title="Generate data source"
        />
    );
}
