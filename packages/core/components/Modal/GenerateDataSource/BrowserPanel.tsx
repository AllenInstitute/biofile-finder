import { Dropdown, IDropdownOption, Icon, TextField } from "@fluentui/react";
import * as React from "react";

import { PrimaryButton, SecondaryButton } from "../../Buttons";

import styles from "./GenerateDataSource.module.css";

enum MetadataTemplate {
    None = "None",
    FoundingGide = "FoundingGIDE",
    SpecialColumns = "(Optional) Special BFF Columns",
}

interface TemplateColumnInfo {
    name: string;
    description: string;
}

interface TemplateInfo {
    description: string;
    columns: TemplateColumnInfo[];
}

const TEMPLATE_OPTIONS: IDropdownOption[] = [
    { key: MetadataTemplate.None, text: MetadataTemplate.None },
    { key: MetadataTemplate.FoundingGide, text: MetadataTemplate.FoundingGide },
    { key: MetadataTemplate.SpecialColumns, text: MetadataTemplate.SpecialColumns },
    // TODO: REMBI & AICS Recommendation
];

/** Maximum number of CSV preview rows to show. */
const PREVIEW_ROW_LIMIT = 5;

const METADATA_TEMPLATES: Record<MetadataTemplate, TemplateInfo> = {
    [MetadataTemplate.None]: { description: "", columns: [] },
    [MetadataTemplate.FoundingGide]: {
        description:
            "Columns based on the Founding GIDE (Guidelines for Imaging Data Exchange) standard for describing bioimaging datasets.",
        columns: [
            {
                name: "Study Description",
                description: "Brief description of the study or experiment",
            },
            { name: "Authors", description: "Names of the authors or contributors" },
            {
                name: "Organization",
                description: "Institution or organization responsible for the data",
            },
            {
                name: "Publication",
                description: "Associated publication reference (DOI, citation, etc.)",
            },
            { name: "License", description: "License under which the data is shared" },
            { name: "Release Date", description: "Date the dataset was released or published" },
            {
                name: "Imaging Method",
                description: "Imaging modality used (e.g., confocal, light-sheet)",
            },
            { name: "Cell Line", description: "Cell line used in the experiment" },
            { name: "Organism", description: "Organism from which the sample was derived" },
            { name: "Gene", description: "Gene of interest or target gene" },
            { name: "Compound", description: "Chemical compound or treatment applied" },
            { name: "Antibody", description: "Antibody used for staining or labeling" },
            {
                name: "Channel \u2013 Content",
                description: "What is being visualized in each channel",
            },
            {
                name: "Channel \u2013 Biological Entity",
                description: "Biological entity targeted by each channel",
            },
            { name: "Instrument", description: "Microscope or instrument used for acquisition" },
            {
                name: "Dimension",
                description: "Spatial dimensions of the image (e.g., 2D, 3D, time-series)",
            },
            {
                name: "Pixel/Voxel Size / Time resolution",
                description: "Physical size of pixels/voxels or temporal resolution",
            },
            { name: "Study Unique ID", description: "Unique identifier for the study" },
            { name: "Dataset Unique ID", description: "Unique identifier for the dataset" },
            {
                name: "Pathology/Disease (Biological Entity)",
                description: "Disease or pathological condition being studied",
            },
            {
                name: "Phenotype (Analysis Data)",
                description: "Observed phenotype or analysis-derived data",
            },
            { name: "Organ", description: "Organ or tissue of origin" },
            { name: "Analyzed Data", description: "Summary or reference to analysis results" },
            {
                name: "Metadata Field",
                description:
                    "Free-text field for additional metadata not captured by other columns",
            },
        ],
    },
    [MetadataTemplate.SpecialColumns]: {
        description:
            "Optional specailized columns recognized by BioFile Finder for enabling certain features.",
        columns: [
            { name: "File Size", description: "Size of the file in bytes, shown during downloads" },
            {
                name: "Thumbnail",
                description: "Web URL to a thumbnail image displayed in the file list",
            },
        ],
    },
    // TODO REMBI: & AICS Recommendation
};

/** Convenience accessor: just the column name strings for a template. */
function getTemplateColumnNames(template: MetadataTemplate): string[] {
    return METADATA_TEMPLATES[template].columns.map((c) => c.name);
}

// ---------------------------------------------------------------------------
// Browser-mode helpers
// ---------------------------------------------------------------------------

/** File as provided by a webkitdirectory input — includes the relative path within the folder. */
type BrowserFile = File & { webkitRelativePath?: string };

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
    pathRegex: string,
    templateColumns: string[] = []
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
    const templateCols = templateColumns.filter(
        (c) => !fixedCols.includes(c) && !regexCols.includes(c) && !remainingCols.includes(c)
    );
    const headers = [
        ...fixedCols,
        ...regexCols,
        ...remainingCols.filter((c) => !fixedCols.includes(c) && !regexCols.includes(c)),
        ...templateCols,
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

interface Props {
    filePattern: string;
    onFilePatternChange: (value: string) => void;
    pathRegex: string;
    onPathRegexChange: (value: string) => void;
    regexError: string | undefined;
    outputFile: string;
    onOutputFileChange: (value: string) => void;
}

/**
 * BrowserPanel allows users to select a local folder, apply a file pattern and optional regex,
 * and download a CSV inventory of the files.
 */
export default function BrowserPanel(props: Props) {
    const {
        filePattern,
        onFilePatternChange,
        pathRegex,
        onPathRegexChange,
        regexError,
        outputFile,
        onOutputFileChange,
    } = props;

    const folderInputRef = React.useRef<HTMLInputElement>(null);
    const [browserFiles, setBrowserFiles] = React.useState<FileList | null>(null);
    const [downloadStatus, setDownloadStatus] = React.useState<"idle" | "done">("idle");
    const [metadataTemplate, setMetadataTemplate] = React.useState<MetadataTemplate>(
        MetadataTemplate.None
    );

    const browserStats = React.useMemo(() => {
        if (!browserFiles) return null;
        const filtered = filterFilesByPattern(Array.from(browserFiles), filePattern);
        return { total: browserFiles.length, matched: filtered.length };
    }, [browserFiles, filePattern]);

    // Live CSV preview string (recomputed when inputs change)
    const csvPreview = React.useMemo(() => {
        if (!browserFiles || !browserStats || browserStats.matched === 0) return null;
        const templateCols = getTemplateColumnNames(metadataTemplate);
        return buildCsvFromBrowserFiles(browserFiles, filePattern, pathRegex, templateCols);
    }, [browserFiles, browserStats, filePattern, pathRegex, metadataTemplate]);

    // Parse csvPreview into header + limited rows for display
    const previewTable = React.useMemo(() => {
        if (!csvPreview) return null;
        const lines = csvPreview.split("\n").filter((l) => l.length > 0);
        if (lines.length === 0) return null;
        const header = parseCsvRow(lines[0]);
        const rows = lines.slice(1, 1 + PREVIEW_ROW_LIMIT).map(parseCsvRow);
        const totalRows = lines.length - 1;
        return { header, rows, totalRows };
    }, [csvPreview]);

    const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBrowserFiles(e.target.files);
        setDownloadStatus("idle");
    };

    const handleDownload = () => {
        if (!browserFiles) return;
        const templateCols = getTemplateColumnNames(metadataTemplate);
        const csv = buildCsvFromBrowserFiles(browserFiles, filePattern, pathRegex, templateCols);
        const outputName = outputFile.trim() || "inventory.csv";
        downloadBlob(csv, outputName.replace(/\.(parquet|json)$/, ".csv"));
        setDownloadStatus("done");
    };

    // ---- Left column: config ----
    const config = (
        <>
            <div className={styles.section}>
                <div className={styles.label}>File pattern (glob)</div>
                <TextField
                    className={styles.input}
                    placeholder="**/*"
                    value={filePattern}
                    onChange={(_e, v) => onFilePatternChange(v ?? "")}
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
                    onChange={(_e, v) => onPathRegexChange(v ?? "")}
                    errorMessage={regexError}
                    description="Named groups become metadata columns. Python: (?P<name>…) or JS: (?<name>…)"
                    multiline
                    rows={3}
                    resizable={false}
                />
            </div>

            <div className={styles.section}>
                <div className={styles.label}>Output filename</div>
                <TextField
                    className={styles.input}
                    placeholder="inventory.csv"
                    value={outputFile}
                    onChange={(_e, v) => onOutputFileChange(v ?? "")}
                    description="Will always be saved as CSV when downloaded from browser"
                />
            </div>

            <div className={styles.section}>
                <div className={styles.label}>
                    Metadata template <span className={styles.optional}>(optional)</span>
                </div>
                <Dropdown
                    className={styles.templateDropdown}
                    selectedKey={metadataTemplate}
                    options={TEMPLATE_OPTIONS}
                    onChange={(_e, opt) =>
                        setMetadataTemplate((opt?.key as MetadataTemplate) ?? MetadataTemplate.None)
                    }
                    styles={{
                        title: { color: "var(--primary-text-color)" },
                        callout: styles.templateCallout,
                    }}
                />
                {metadataTemplate !== MetadataTemplate.None && (
                    <div className={styles.templateInfo}>
                        <p className={styles.templateDescription}>
                            {METADATA_TEMPLATES[metadataTemplate].description}
                        </p>
                        <hr />
                        <div className={styles.templateColumns}>
                            {METADATA_TEMPLATES[metadataTemplate].columns.map((col) => (
                                <div key={col.name} className={styles.templateColumn}>
                                    <span className={styles.templateColumnName}>{col.name}</span>
                                    <span className={styles.templateColumnDesc}>
                                        {col.description}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );

    // ---- Right column: actions + preview ----
    const panel = (
        <div className={styles.browserPanel}>
            <p className={styles.browserHint}>
                Select a local folder — the app will read the file paths, apply your regex, and
                download a CSV ready to load in BioFile Finder.
            </p>

            {/* Hidden folder input */}
            <input
                ref={folderInputRef}
                type="file"
                {...({
                    webkitdirectory: true,
                    multiple: true,
                } as React.InputHTMLAttributes<HTMLInputElement>)}
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

            {/* CSV preview table */}
            {previewTable && (
                <div className={styles.csvPreview}>
                    <div className={styles.csvPreviewHeader}>
                        <span className={styles.label}>CSV Preview</span>
                        <span className={styles.csvPreviewCount}>
                            {previewTable.totalRows > PREVIEW_ROW_LIMIT
                                ? `showing ${PREVIEW_ROW_LIMIT} of ${previewTable.totalRows} rows`
                                : `${previewTable.totalRows} row${
                                      previewTable.totalRows !== 1 ? "s" : ""
                                  }`}
                        </span>
                    </div>
                    <div className={styles.csvPreviewTableWrap}>
                        <table className={styles.csvPreviewTable}>
                            <thead>
                                <tr>
                                    {previewTable.header.map((h, i) => (
                                        <th key={i}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {previewTable.rows.map((row, ri) => (
                                    <tr key={ri}>
                                        {previewTable.header.map((_, ci) => (
                                            <td key={ci}>{row[ci] ?? ""}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
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

    return (
        <>
            <div className={styles.leftCol}>{config}</div>
            <div className={styles.vDivider} />
            <div className={styles.rightCol}>{panel}</div>
        </>
    );
}

// ---------------------------------------------------------------------------
// Minimal CSV row parser (handles quoted fields with commas)
// ---------------------------------------------------------------------------
function parseCsvRow(line: string): string[] {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"' && line[i + 1] === '"') {
                current += '"';
                i++;
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                current += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ",") {
                cells.push(current);
                current = "";
            } else {
                current += ch;
            }
        }
    }
    cells.push(current);
    return cells;
}
