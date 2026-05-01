import { Checkbox, TextField } from "@fluentui/react";
import * as React from "react";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import { SecondaryButton } from "../../Buttons";
import CodeSnippet from "../../CodeSnippet";
import { detectBioioPlugins } from "../../CodeSnippet/CodeUtils";

import styles from "./GenerateDataSource.module.css";

/**
 * Generates a Python script that inventories a folder and creates a CSV/Parquet data source.
 * Users supply:
 *   - A root folder path
 *   - An optional file-glob pattern (default: all files recursively)
 *   - An optional regex with named groups to extract metadata from file paths
 *   - Whether to use bioio to extract embedded image metadata
 */
export default function GenerateDataSource({ onDismiss }: ModalProps) {
    const [folderPath, setFolderPath] = React.useState("");
    const [filePattern, setFilePattern] = React.useState("**/*");
    const [pathRegex, setPathRegex] = React.useState("");
    const [useBioio, setUseBioio] = React.useState(false);
    const [outputFile, setOutputFile] = React.useState("inventory.csv");

    // Derive whether the user's regex looks valid
    const regexError = React.useMemo(() => {
        if (!pathRegex) return undefined;
        return isInvalidRegex(pathRegex) ? "Invalid regular expression" : undefined;
    }, [pathRegex]);

    // Detect plugins from extension hints in the file-pattern
    const detectedPlugins = React.useMemo(() => {
        // Pull extension from the glob pattern as a hint
        const match = filePattern.match(/\*(\.[a-zA-Z0-9.]+)$/);
        const ext = match ? match[1].toLowerCase() : "";
        return ext ? detectBioioPlugins([`file${ext}`]) : [];
    }, [filePattern]);

    // Build the Python snippet on every input change
    const { setup, code } = React.useMemo(
        () => buildSnippet({ folderPath, filePattern, pathRegex, useBioio, outputFile, detectedPlugins }),
        [folderPath, filePattern, pathRegex, useBioio, outputFile, detectedPlugins]
    );

    const body = (
        <div className={styles.shell}>
            <div className={styles.columns}>
                {/* ---- LEFT COLUMN: inputs ---- */}
                <div className={styles.leftCol}>
                    <div className={styles.section}>
                        <div className={styles.label}>Root folder path</div>
                        <TextField
                            className={styles.input}
                            placeholder="/data/my_images"
                            value={folderPath}
                            onChange={(_e, v) => setFolderPath(v ?? "")}
                        />
                    </div>

                    <div className={styles.section}>
                        <div className={styles.label}>File pattern (glob)</div>
                        <TextField
                            className={styles.input}
                            placeholder="**/*"
                            value={filePattern}
                            onChange={(_e, v) => setFilePattern(v ?? "")}
                            description='e.g. "**/*.tiff" to match all TIFF files recursively'
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
                            description="Use named groups (?P<column_name>...) to extract metadata from the file path"
                            multiline
                            rows={3}
                            resizable={false}
                        />
                    </div>

                    <div className={styles.section}>
                        <div className={styles.label}>Output file</div>
                        <TextField
                            className={styles.input}
                            placeholder="inventory.csv"
                            value={outputFile}
                            onChange={(_e, v) => setOutputFile(v ?? "")}
                            description='Use .csv, .parquet, or .json extension'
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
                </div>

                <div className={styles.vDivider} />

                {/* ---- RIGHT COLUMN: code snippet ---- */}
                <div className={styles.rightCol}>
                    <CodeSnippet setup={setup} code={code} />
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
// Code-generation helpers
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

    const imports = useBioio ? `import re\nimport sys\nfrom pathlib import Path\nimport pandas as pd` : `import re\nfrom pathlib import Path\nimport pandas as pd`;

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
