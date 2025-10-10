import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import { selection, interaction } from "../../../state";
import { setProcessFilesPythonSnippet } from "../../../state/interaction/actions";
import CodeSnippet from "../../CodeSnippet";
import { detectBioioPlugins } from "../../CodeSnippet/CodeUtils";

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

                // Build the Python list of selected files
                const pyList = details
                    .map((f: { path: string }) => `    "${safe(f.path)}"`)
                    .join(",\n");

                // Detect BioIO plugins from selection
                const plugins = detectBioioPlugins(details.map((d: { path: string }) => d.path));

                // Base + Pandas + recommended plugins
                const baseDeps = ["bioio", "pandas"];
                const allDeps = [...baseDeps, ...plugins];

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
                console.error("Failed to generate process-files snippet:", err);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [dispatch, fileSelection]);

    return (
        <BaseModal
            onDismiss={onDismiss}
            title="Process files — extract metadata (python)"
            body={<CodeSnippet setup={snippet?.setup} code={snippet?.code} />}
        />
    );
}
