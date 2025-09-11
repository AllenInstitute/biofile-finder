import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { ModalProps } from "..";
import { selection, interaction } from "../../../state";
import { setProcessFilesPythonSnippet } from "../../../state/interaction/actions";
import CodeSnippet from ".";

export default function ProcessFiles({ onDismiss }: ModalProps) {
    const dispatch = useDispatch();
    const fileSelection = useSelector(selection.selectors.getFileSelection);
    const snippet = useSelector(interaction.selectors.getProcessFilesPythonSnippet);

    React.useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const details = await fileSelection.fetchAllDetails();
                if (!mounted) return;

                const safe = (s: string) =>
                    String(s ?? "")
                        .replace(/\\/g, "\\\\")
                        .replace(/"/g, '\\"');

                // Plugin registry
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
                    .map((f: { path: string }) => {
                        const p = f.path;
                        const lower = p.toLowerCase();
                        for (const [ext, pkg] of EXT_TO_PKG) {
                            if (lower.endsWith(ext)) {
                                pluginPkgs.add(pkg);
                                break;
                            }
                        }
                        return `    "${safe(p)}"`;
                    })
                    .join(",\n");

                const baseDeps = ["bioio", "pandas"];
                const pluginDeps = Array.from(pluginPkgs).sort();
                const allDeps = baseDeps.concat(pluginDeps);

                const setup = `# Recommended installs based on your selection:
pip install ${allDeps.join(" ")}
# Run this with Python 3.10+`;

                const code = `import sys
import pandas as pd
from bioio import BioImage

selected_files = [
${pyList}
]

records = []
for file_path in selected_files:
    rec = {"file_path": file_path}
    try:
        img = BioImage(file_path)
        rec.update(img.standard_metadata.to_dict())
    except Exception as e:
        print(f"[WARN] Failed to read '{file_path}': {e}", file=sys.stderr)
    records.append(rec)

df = pd.json_normalize(records, sep=".")
cols = ["file_path"] + [c for c in df.columns if c != "file_path"]
df = df[cols]

out_path = "selected_files_metadata.csv"
df.to_csv(out_path, index=False)
print(f"Wrote {out_path} with {len(df)} rows and {len(df.columns)} columns.")`;

                dispatch(setProcessFilesPythonSnippet({ setup, code }));
            } catch (err) {
                dispatch(setProcessFilesPythonSnippet({}));
                // eslint-disable-next-line no-console
                console.error("Failed to generate process-files snippet:", err);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [dispatch, fileSelection]);

    return (
        <CodeSnippet
            onDismiss={onDismiss}
            title="Process Files — Extract Metadata Python Snippet"
            setup={snippet?.setup}
            code={snippet?.code}
        />
    );
}
