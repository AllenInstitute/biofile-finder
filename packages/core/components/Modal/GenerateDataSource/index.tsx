import { Checkbox, Icon, TextField } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import { PrimaryButton, SecondaryButton } from "../../Buttons";
import CodeSnippet from "../../CodeSnippet";
import { detectBioioPlugins } from "../../CodeSnippet/CodeUtils";

import styles from "./GenerateDataSource.module.css";

type Mode = "python" | "browser";

/** File as provided by a webkitdirectory input — includes the relative path within the folder. */
type BrowserFile = File & { webkitRelativePath?: string };

/**
 * Generates a data source in two ways:
 *
 * 1. **Python Script** – generates ready-to-run Python that inventories a folder and produces
 *    a CSV/Parquet/JSON for use in BioFile Finder.
 *
 * 2. **Parse Folder in Browser** – user selects a local folder; the app reads the file paths,
 *    applies an optional regex to extract metadata, and downloads a CSV immediately.
 */
export default function GenerateDataSource({ onDismiss }: ModalProps) {
    const [mode, setMode] = React.useState<Mode>("python");

    // ---- Shared settings ----
    const [filePattern, setFilePattern] = React.useState("**/*");
    const [pathRegex, setPathRegex] = React.useState("");

    // ---- Python-script–only settings ----
    const [folderPath, setFolderPath] = React.useState("");
    const [useBioio, setUseBioio] = React.useState(false);
    const [outputFile, setOutputFile] = React.useState("inventory.csv");

    // ---- Browser-mode–only state ----
    const folderInputRef = React.useRef<HTMLInputElement>(null);
    const [browserFiles, setBrowserFiles] = React.useState<FileList | null>(null);
    const [downloadStatus, setDownloadStatus] = React.useState<"idle" | "done">("idle");

    // Derive whether the user's regex looks valid (Python (?P<..>) or JS (?<..>) syntax)
    const regexError = React.useMemo(() => {
        if (!pathRegex) return undefined;
        return isInvalidRegex(pathRegex) ? "Invalid regular expression" : undefined;
    }, [pathRegex]);

    // Detect BioIO plugins from the file-pattern extension hint
    const detectedPlugins = React.useMemo(() => {
        const match = filePattern.match(/\*(\.[a-zA-Z0-9.]+)$/);
        const ext = match ? match[1].toLowerCase() : "";
        return ext ? detectBioioPlugins([`file${ext}`]) : [];
    }, [filePattern]);

    // Python snippet (live-updated)
    const { setup, code } = React.useMemo(
        () =>
            buildSnippet({
                folderPath,
                filePattern,
                pathRegex,
                useBioio,
                outputFile,
                detectedPlugins,
            }),
        [folderPath, filePattern, pathRegex, useBioio, outputFile, detectedPlugins]
    );

    // Browser mode: stats about selected folder
    const browserStats = React.useMemo(() => {
        if (!browserFiles) return null;
        const filtered = filterFilesByPattern(Array.from(browserFiles), filePattern);
        return { total: browserFiles.length, matched: filtered.length };
    }, [browserFiles, filePattern]);

    // ---- Handlers ----
    const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBrowserFiles(e.target.files);
        setDownloadStatus("idle");
    };

    const handleDownload = () => {
        if (!browserFiles) return;
        const csv = buildCsvFromBrowserFiles(browserFiles, filePattern, pathRegex);
        const outputName = outputFile.trim() || "inventory.csv";
        downloadBlob(csv, outputName.replace(/\.(parquet|json)$/, ".csv"));
        setDownloadStatus("done");
    };

    // ---- Shared config panel (left column) ----
    const sharedConfig = (
        <>
            <div className={styles.section}>
                <div className={styles.label}>File pattern (glob)</div>
                <TextField
                    className={styles.input}
                    placeholder="**/*"
                    value={filePattern}
                    onChange={(_e, v) => setFilePattern(v ?? "")}
                    description='e.g. "**/*.tiff" to match only TIFF files'
                />
            </div>

            <div className={styles.section}>
                <div className={styles.label}>
                    Path regex <span className={styles.optional}>(optional)</span>
                </div>
                <TextField
                    className={styles.input}
                    placeholder="(?P<gene>[^/]+)/(?P<cell_line>[^/]+)/[^/]+$"
                    value={pathRegex}
                    onChange={(_e, v) => setPathRegex(v ?? "")}
                    errorMessage={regexError}
                    description="Named groups become metadata columns. Python: (?P<name>…) or JS: (?<name>…)"
                    multiline
                    rows={3}
                    resizable={false}
                />
            </div>
        </>
    );

    // ---- Python-mode left column ----
    const pythonConfig = (
        <>
            <div className={styles.section}>
                <div className={styles.label}>Root folder path</div>
                <TextField
                    className={styles.input}
                    placeholder="/data/my_images"
                    value={folderPath}
                    onChange={(_e, v) => setFolderPath(v ?? "")}
                />
            </div>
            {sharedConfig}
            <div className={styles.section}>
                <div className={styles.label}>Output file</div>
                <TextField
                    className={styles.input}
                    placeholder="inventory.csv"
                    value={outputFile}
                    onChange={(_e, v) => setOutputFile(v ?? "")}
                    description="Use .csv, .parquet, or .json extension"
                />
            </div>
            <div className={styles.section}>
                <Checkbox
                    label="Extract embedded metadata with BioIO"
                    checked={useBioio}
                    onChange={(_e, checked) => setUseBioio(!!checked)}
                />
                {useBioio && detectedPlugins.length > 0 && (
                    <p className={styles.pluginHint}>
                        Detected plugins: {detectedPlugins.join(", ")}
                    </p>
                )}
            </div>
        </>
    );

    // ---- Browser-mode left column ----
    const browserConfig = (
        <>
            {sharedConfig}
            <div className={styles.section}>
                <div className={styles.label}>Output filename</div>
                <TextField
                    className={styles.input}
                    placeholder="inventory.csv"
                    value={outputFile}
                    onChange={(_e, v) => setOutputFile(v ?? "")}
                    description="Will always be saved as CSV when downloaded from browser"
                />
            </div>
        </>
    );

    // ---- Browser-mode right column ----
    const browserPanel = (
        <div className={styles.browserPanel}>
            <p className={styles.browserHint}>
                Select a local folder — the app will read the file paths, apply your regex, and
                download a CSV ready to load in BioFile Finder.
            </p>

            {/* Hidden folder input */}
            <input
                ref={folderInputRef}
                type="file"
                // webkitdirectory and directory are non-standard attrs — cast to any
                {...({ webkitdirectory: true, multiple: true } as React.InputHTMLAttributes<HTMLInputElement>)}
                style={{ display: "none" }}
                onChange={handleFolderSelect}
                data-testid="folder-input"
            />

            <SecondaryButton
                className={styles.folderPickerButton}
                iconName="FolderOpen"
                onClick={() => folderInputRef.current?.click()}
                text={browserFiles ? "Change folder…" : "Select folder…"}
                title="Select a local folder to inventory"
            />

            {browserStats && (
                <div className={styles.browserStats}>
                    <Icon iconName="Folder" className={styles.statsIcon} />
                    <span>
                        <strong>{browserStats.matched}</strong> file
                        {browserStats.matched !== 1 ? "s" : ""} matched
                        {browserStats.total !== browserStats.matched && (
                            <> ({browserStats.total} total in folder)</>
                        )}
                    </span>
                </div>
            )}

            {browserFiles && browserStats && browserStats.matched === 0 && (
                <p className={styles.noMatchWarning}>
                    No files matched the current file pattern. Try changing the pattern.
                </p>
            )}

            <PrimaryButton
                className={styles.downloadButton}
                disabled={!browserFiles || (browserStats?.matched ?? 0) === 0}
                iconName="Download"
                onClick={handleDownload}
                text="Download CSV"
                title="Generate and download a CSV of the selected folder"
            />

            {downloadStatus === "done" && (
                <p className={styles.downloadDone}>
                    <Icon iconName="CheckMark" /> CSV downloaded successfully.
                </p>
            )}
        </div>
    );

    // ---- Modal body ----
    const body = (
        <div className={styles.shell}>
            {/* Mode switcher */}
            <div className={styles.modeSwitcher}>
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
            </div>

            <div className={styles.columns}>
                {/* Left column */}
                <div className={styles.leftCol}>
                    {mode === "python" ? pythonConfig : browserConfig}
                </div>

                <div className={styles.vDivider} />

                {/* Right column */}
                <div className={styles.rightCol}>
                    {mode === "python" ? (
                        <CodeSnippet setup={setup} code={code} />
                    ) : (
                        browserPanel
                    )}
                </div>
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
            title="Generate data source from folder"
        />
    );
}

// ---------------------------------------------------------------------------
// Browser-mode helpers
// ---------------------------------------------------------------------------

/**
 * Filter files by the glob-like pattern.
 * Only handles simple extension filters like `"**&#47;*.tiff"` — other patterns pass all files through.
 */
export function filterFilesByPattern(files: File[], pattern: string): File[] {
    const match = pattern.trim().match(/\*(\.[a-zA-Z0-9.]+)$/);
    if (!match) return files;
    const ext = match[1].toLowerCase();
    return files.filter((f) => f.name.toLowerCase().endsWith(ext));
}

/**
 * Build a CSV string from browser-selected files using the supplied pattern and regex.
 * Accepts both Python `(?P{name}...)` and JS `(?{name}...)` named-group syntax.
 */
export function buildCsvFromBrowserFiles(
    files: FileList | File[],
    filePattern: string,
    pathRegex: string
): string {
    const filtered = filterFilesByPattern(Array.from(files), filePattern);

    // Convert Python named-group syntax to JS for use in the browser
    let jsRegex: RegExp | null = null;
    if (pathRegex.trim()) {
        try {
            const jsPattern = pathRegex.replace(/\(\?P</g, "(?<");
            jsRegex = new RegExp(jsPattern);
        } catch {
            // Fall back to no regex if conversion/compile fails
        }
    }

    // Parse each file into a record
    const records = filtered.map((file) => {
        const path = (file as BrowserFile).webkitRelativePath || file.name;
        const rec: Record<string, string> = {
            "File Path": path,
            "File Name": file.name,
            "File Size": String(file.size),
        };
        if (jsRegex) {
            const m = jsRegex.exec(path);
            if (m?.groups) {
                // Insert regex-extracted columns right after "File Path"
                Object.assign(rec, m.groups);
            }
        }
        return rec;
    });

    // Collect all column headers (File Path first, regex columns next, then rest)
    const fixedCols = ["File Path"];
    const regexCols: string[] = [];
    if (jsRegex) {
        // Extract named-group names from the pattern to preserve column order
        const groupNameRe = /\(\?(?:P?)<([^>]+)>/g;
        let gm: RegExpExecArray | null;
        const jsPattern = pathRegex.replace(/\(\?P</g, "(?<");
        while ((gm = groupNameRe.exec(jsPattern)) !== null) {
            if (!regexCols.includes(gm[1])) regexCols.push(gm[1]);
        }
    }
    const remainingCols = ["File Name", "File Size"];
    const headers = [
        ...fixedCols,
        ...regexCols,
        ...remainingCols.filter((c) => !fixedCols.includes(c) && !regexCols.includes(c)),
    ];

    if (records.length === 0) return headers.join(",") + "\n";

    // Escape a single CSV cell value
    const escapeCell = (v: string): string => {
        if (v.includes(",") || v.includes('"') || v.includes("\n")) {
            return `"${v.replace(/"/g, '""')}"`;
        }
        return v;
    };

    const rows = [
        headers.join(","),
        ...records.map((r) => headers.map((h) => escapeCell(r[h] ?? "")).join(",")),
    ];
    return rows.join("\n");
}

/**
 * Trigger a CSV download in the browser.
 */
export function downloadBlob(content: string, filename: string): void {
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Python-script code-generation helpers
// ---------------------------------------------------------------------------

export interface SnippetOptions {
    folderPath: string;
    filePattern: string;
    pathRegex: string;
    useBioio: boolean;
    outputFile: string;
    detectedPlugins: string[];
}

export function buildSnippet(opts: SnippetOptions): { setup: string; code: string } {
    const { folderPath, filePattern, pathRegex, useBioio, outputFile, detectedPlugins } = opts;

    const safe = (s: string) =>
        String(s ?? "")
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"');

    const safeFolder = folderPath.trim() ? safe(folderPath.trim()) : "/path/to/your/folder";
    const safePattern = filePattern.trim() ? safe(filePattern.trim()) : "**/*";
    const safeOutput = outputFile.trim() ? safe(outputFile.trim()) : "inventory.csv";

    // Determine output format from extension
    const ext = safeOutput.split(".").pop()?.toLowerCase() ?? "csv";
    const validExt = ["csv", "parquet", "json"].includes(ext) ? ext : "csv";

    // Build setup block
    const baseDeps = useBioio ? ["pandas", "bioio"] : ["pandas"];
    const allDeps = [...baseDeps, ...detectedPlugins];
    const setup = `# Recommended installs:
pip install ${allDeps.join(" ")}
# Run with Python 3.10+`;

    // Build path-regex block
    let regexBlock = "";
    if (pathRegex.trim() && !isInvalidRegex(pathRegex)) {
        regexBlock = `
# Named groups in this pattern become metadata columns
PATH_REGEX = re.compile(r"""${safe(pathRegex.trim())}""", re.VERBOSE)

def parse_path(path: str) -> dict:
    m = PATH_REGEX.search(path)
    return m.groupdict() if m else {}
`;
    } else {
        regexBlock = `
def parse_path(path: str) -> dict:
    return {}
`;
    }

    // Build bioio block
    const bioioBlock = useBioio
        ? `
    # Extract embedded image metadata with BioIO
    try:
        from bioio import BioImage
        img = BioImage(file_path)
        rec.update(img.standard_metadata.to_dict())
    except Exception as e:
        print(f"[WARN] BioIO could not read '{file_path}': {e}", file=sys.stderr)
`
        : "";

    // Build save block
    let saveBlock: string;
    if (validExt === "parquet") {
        saveBlock = `df.to_parquet(out_path, index=False)`;
    } else if (validExt === "json") {
        saveBlock = `df.to_json(out_path, orient="records", indent=2)`;
    } else {
        saveBlock = `df.to_csv(out_path, index=False)`;
    }

    const imports = useBioio
        ? `import re\nimport sys\nfrom pathlib import Path\nimport pandas as pd`
        : `import re\nfrom pathlib import Path\nimport pandas as pd`;

    const code = `${imports}

FOLDER = Path("${safeFolder}")
PATTERN = "${safePattern}"
OUT_PATH = "${safeOutput}"
${regexBlock}
records = []
for file_path in sorted(FOLDER.glob(PATTERN)):
    if not file_path.is_file():
        continue
    rec = {
        "File Path": str(file_path),
        "File Name": file_path.name,
        "File Size": file_path.stat().st_size,
    }
    rec.update(parse_path(str(file_path)))
${bioioBlock}    records.append(rec)

df = pd.DataFrame(records)
# Move "File Path" to first column
cols = ["File Path"] + [c for c in df.columns if c != "File Path"]
df = df[cols]

out_path = OUT_PATH
${saveBlock}
print(f"Wrote {{out_path}} with {{len(df)}} rows and {{len(df.columns)}} columns.")
`;

    return { setup, code };
}

function isInvalidRegex(pattern: string): boolean {
    // Convert Python-style named groups (?P<name>...) to JS-style (?<name>...) for validation,
    // since this regex is intended for Python code and Python's re module uses (?P<...>) syntax.
    const jsCompatible = pattern.replace(/\(\?P</g, "(?<");
    try {
        new RegExp(jsCompatible);
        return false;
    } catch {
        return true;
    }
}
