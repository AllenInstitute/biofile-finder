import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { TextField, TooltipHost, DirectionalHint } from "@fluentui/react";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import { SecondaryButton, TertiaryButton } from "../../Buttons";
import { interaction, selection } from "../../../state";
import { setConvertFilesSnippet } from "../../../state/interaction/actions";
import ChoiceGroup from "../../ChoiceGroup";

import styles from "./ConvertToZarr.module.css";

type UIOpts = {
    destination: string;
    scenesMode: "all" | "single";
    sceneIndex: string;
};

function Snippet({
    title,
    text,
    copyAria,
}: {
    title: "Setup" | "Code";
    text?: string;
    copyAria: string;
}) {
    const [copied, setCopied] = React.useState(false);
    const value = text ?? "";

    const onCopy = () => {
        if (!value) return;
        navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 900);
    };

    return (
        <>
            <div className={styles.snipHeader}>
                <div className={styles.snipTitle}>{title}</div>
                <TooltipHost
                    content={copied ? "Copied!" : undefined}
                    directionalHint={DirectionalHint.leftCenter}
                >
                    <TertiaryButton
                        iconName="Copy"
                        aria-label={copyAria}
                        title="Copy"
                        className={styles.snipCopyBtn}
                        onClick={onCopy}
                    />
                </TooltipHost>
            </div>

            <pre className={styles.codeBox}>
                <code>{value || (title === "Setup" ? "# Install..." : "Code...")}</code>
            </pre>
        </>
    );
}

export default function ConvertToZarr({ onDismiss }: ModalProps) {
    const dispatch = useDispatch();
    const fileSelection = useSelector(selection.selectors.getFileSelection);
    const snippet = useSelector(interaction.selectors.getConvertFilesSnippet);

    // Defaults
    const [opts, setOpts] = React.useState<UIOpts>({
        destination: "",
        scenesMode: "all",
        sceneIndex: "0",
    });

    const safe = (s: string) =>
        String(s ?? "")
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"');

    const toScenesPy = (mode: UIOpts["scenesMode"], idx: string): string | null => {
        if (mode !== "single") return null; // omit when "all"
        const v = (idx || "").trim();
        if (!v) return null;
        if (/^\d+$/.test(v)) return String(parseInt(v, 10));
        return null;
    };

    // Build DEFAULTS dict string with only present keys
    const buildDefaultsPy = (ui: UIOpts) => {
        const lines: string[] = [];

        const dest = (ui.destination || "").trim();
        if (dest) {
            lines.push(`"destination": ${JSON.stringify(dest)},`);
        }

        const scenesPy = toScenesPy(ui.scenesMode, ui.sceneIndex);
        if (scenesPy !== null) {
            lines.push(`"scenes": ${scenesPy},`);
        }

        if (!lines.length) return "DEFAULTS = {}";
        return `DEFAULTS = {\n${lines.map((l) => `    ${l}`).join("\n")}\n}`;
    };

    const detailsRef = React.useRef<Array<{ path: string }>>([]);

    const regenerate = React.useCallback(
        (details: Array<{ path: string }>, ui: UIOpts) => {
            const EXT_TO_PKG: Array<[string, string]> = [
                [".ome.tiff", "bioio-ome-tiff"],
                [".ome.tif", "bioio-ome-tiff"],
                [".tiff", "bioio-ome-tiff"],
                [".tif", "bioio-ome-tiff"],
                [".czi", "bioio-czi"],
                [".nd2", "bioio-nd2"],
                [".lif", "bioio-lif"],
                [".ome.zarr", "bioio-ome-zarr"],
                [".zarr", "bioio-ome-zarr"],
            ];

            const pluginPkgs = new Set<string>();
            const pyList = details
                .map((f) => {
                    const lower = f.path.toLowerCase();
                    for (const [ext, pkg] of EXT_TO_PKG) {
                        if (lower.endsWith(ext)) {
                            pluginPkgs.add(pkg);
                            break;
                        }
                    }
                    return `    "${safe(f.path)}"`;
                })
                .join(",\n");

            const setup = `# Install conversion + plugins detected from your selection:
pip install bioio-conversion ${Array.from(pluginPkgs).sort().join(" ")}
# Recommended: Python 3.11+`;

            const defaultsBlock = buildDefaultsPy(ui);

            const code = `from bioio_conversion.converters import BatchConverter

selected_files = [
${pyList}
]

${defaultsBlock}

def main() -> None:
    bc = BatchConverter(default_opts=DEFAULTS)
    jobs = bc.from_list(selected_files)
    bc.run_jobs(jobs)

if __name__ == "__main__":
    main()
`;

            const storedOptions: Record<string, string> = {};
            const trimmedDest = ui.destination.trim();
            if (trimmedDest) {
                storedOptions.destination = trimmedDest;
            }
            const scenesForStore =
                ui.scenesMode === "single" && /^\d+$/.test((ui.sceneIndex || "").trim())
                    ? String(parseInt(ui.sceneIndex.trim(), 10))
                    : null;
            if (scenesForStore !== null) {
                storedOptions.scenes = scenesForStore;
            }

            dispatch(
                setConvertFilesSnippet({
                    setup,
                    code,
                    options: storedOptions,
                })
            );
        },
        [dispatch]
    );

    React.useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const details = await fileSelection.fetchAllDetails();
                if (!mounted) return;
                detailsRef.current = details;
                regenerate(details, opts);
            } catch (err) {
                dispatch(setConvertFilesSnippet({ setup: "", code: "", options: {} }));
                console.error("Failed to generate convert-files snippet:", err);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [dispatch, fileSelection, regenerate]);

    React.useEffect(() => {
        if (detailsRef.current.length) regenerate(detailsRef.current, opts);
    }, [opts, regenerate]);

    // ----- BODY -----
    const body = (
        <div className={styles.shell}>
            <div className={styles.columns}>
                {/* LEFT COLUMN*/}
                <div className={styles.leftCol}>
                    <div className={styles.section}>
                        <div className={styles.label}>Choose destination</div>

                        <div className={styles.destChipRow}>
                            <div
                                className={classNames(
                                    styles.destChip,
                                    !opts.destination && styles.destChipEmpty
                                )}
                                title={opts.destination || "selected folder"}
                            >
                                {opts.destination || "selected folder"}
                                {!!opts.destination && (
                                    <button
                                        className={styles.destChipClose}
                                        aria-label="Clear"
                                        title="Clear"
                                        onClick={() => setOpts((o) => ({ ...o, destination: "" }))}
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        </div>

                        <SecondaryButton
                            text="BROWSE"
                            onClick={() => {
                                // what should go here?
                            }}
                            className={styles.browseBtn}
                        />
                    </div>

                    <div className={styles.section} style={{ marginTop: 20 }}>
                        <div className={styles.label}>Scenes</div>
                        <ChoiceGroup
                            className={styles.choiceGroup}
                            defaultSelectedKey={opts.scenesMode}
                            options={[
                                { key: "all", text: "All scenes" },
                                { key: "single", text: "Single scene" },
                            ]}
                            onChange={(_, option) =>
                                setOpts((o) => ({
                                    ...o,
                                    scenesMode: (option?.key as "all" | "single") ?? "all",
                                }))
                            }
                        />

                        {opts.scenesMode === "single" && (
                            <div className={styles.searchBox}>
                                <TextField
                                    value={opts.sceneIndex}
                                    type="number"
                                    onChange={(_e, v) =>
                                        setOpts((o) => ({
                                            ...o,
                                            sceneIndex: (v ?? "0").replace(/[^\d]/g, ""),
                                        }))
                                    }
                                    placeholder="0"
                                    borderless
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN*/}
                <div className={styles.rightCol}>
                    <Snippet title="Setup" text={snippet?.setup} copyAria="Copy setup" />
                    <Snippet title="Code" text={snippet?.code} copyAria="Copy code" />
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
            title="Convert files to OME-Zarr"
        />
    );
}
