import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { TextField } from "@fluentui/react";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import { SecondaryButton } from "../../Buttons";
import { interaction, selection } from "../../../state";
import { setConvertFilesSnippet } from "../../../state/interaction/actions";
import ChoiceGroup from "../../ChoiceGroup";
import { detectBioioPlugins } from "../../CodeSnippet/CodeUtils";
import CodeSnippet from "../../CodeSnippet";

import styles from "./ConvertToZarr.module.css";

type UIOpts = {
    destination: string;
    scenesMode: "all" | "single";
    sceneIndex: string;
};

export default function ConvertToZarr({ onDismiss }: ModalProps) {
    const dispatch = useDispatch();
    const fileSelection = useSelector(selection.selectors.getFileSelection);
    const snippet = useSelector(interaction.selectors.getConvertFilesSnippet);

    const [opts, setOpts] = React.useState<UIOpts>({
        destination: "",
        scenesMode: "all",
        sceneIndex: "0",
    });

    const detailsRef = React.useRef<Array<{ path: string }>>([]);
    const optsRef = React.useRef<UIOpts>(opts);
    React.useEffect(() => {
        optsRef.current = opts;
    }, [opts]);

    // Rebuilds the code snippet whenever user’s UI options change.
    const regenerate = React.useCallback(
        (details: Array<{ path: string }>) => {
            const ui = optsRef.current;

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

            const buildDefaultsPy = (ui0: UIOpts) => {
                const lines: string[] = [];
                const dest = (ui0.destination || "").trim();
                if (dest) lines.push(`"destination": ${JSON.stringify(dest)},`);
                const scenesPy = toScenesPy(ui0.scenesMode, ui0.sceneIndex);
                if (scenesPy !== null) lines.push(`"scenes": ${scenesPy},`);
                return lines.length
                    ? `DEFAULTS = {\n${lines.map((l) => `    ${l}`).join("\n")}\n}`
                    : "DEFAULTS = {}";
            };

            // Build the Python file list
            const pyList = details.map((f) => `    "${safe(f.path)}"`).join(",\n");

            // Detect plugins (returns just plugin package names)
            const plugins = detectBioioPlugins(details.map((d) => d.path));

            // Build the setup snippet (recommend bioio + detected plugins)
            const setupPackages = ["bioio-conversion", ...plugins].join(" ").trim();
            const setup = `# Install bioio-conversion + plugins detected from your selection:
pip install ${setupPackages}
# Recommended: Python 3.11+`;

            const defaultsBlock = buildDefaultsPy(ui);

            const code = `from bioio_conversion.converters import BatchConverter

selected_files = [
${pyList}
]

# See bioio-conversion documentation for additional default options.
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
            if (trimmedDest) storedOptions.destination = trimmedDest;

            const scenesForStore =
                ui.scenesMode === "single" && /^\d+$/.test((ui.sceneIndex || "").trim())
                    ? String(parseInt(ui.sceneIndex.trim(), 10))
                    : null;
            if (scenesForStore !== null) storedOptions.scenes = scenesForStore;

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

    // Fetch details
    React.useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const details = await fileSelection.fetchAllDetails();
                if (!mounted) return;
                detailsRef.current = details;
                regenerate(details); // uses latest opts via ref
            } catch (err) {
                dispatch(setConvertFilesSnippet({ setup: "", code: "", options: {} }));
                console.error("Failed to generate convert-files snippet:", err);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [dispatch, fileSelection, regenerate]);

    // Re-generate when UI options change, without re-fetching details
    React.useEffect(() => {
        if (detailsRef.current.length) {
            regenerate(detailsRef.current);
        }
    }, [opts, regenerate]);

    // ----- BODY -----
    const body = (
        <div className={styles.shell}>
            <div className={styles.columns}>
                {/* LEFT COLUMN */}
                <div className={styles.leftCol}>
                    <div className={styles.section}>
                        <div className={styles.label}>Scenes</div>
                        <ChoiceGroup
                            className={styles.choiceGroup}
                            defaultSelectedKey={opts.scenesMode}
                            options={[
                                { key: "all", text: "All scenes" },
                                { key: "single", text: "Single scene" },
                            ]}
                            onChange={(_, option) =>
                                setOpts((o) => {
                                    const mode = (option?.key as "all" | "single") ?? "all";
                                    if (mode === "single") {
                                        const idx = (o.sceneIndex ?? "").trim();
                                        return {
                                            ...o,
                                            scenesMode: mode,
                                            sceneIndex: idx ? idx : "0",
                                        };
                                    }
                                    return { ...o, scenesMode: mode };
                                })
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

                {/* RIGHT COLUMN */}
                <div className={styles.rightCol}>
                    <CodeSnippet setup={snippet?.setup} code={snippet?.code} />
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
