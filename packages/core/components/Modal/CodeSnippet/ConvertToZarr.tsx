import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { TextField, Dropdown, IDropdownOption, Checkbox } from "@fluentui/react";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import { SecondaryButton } from "../../Buttons";
import { interaction, selection } from "../../../state";
import { setConvertFilesSnippet } from "../../../state/interaction/actions";

import styles from "./ConvertToZarr.module.css";

/** Small embedded code viewer (NOT a modal) */
function EmbeddedSnippet({
  title,
  setup,
  code,
}: {
  title: string;
  setup?: string;
  code?: string;
}) {
  const copy = async (text?: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };
  return (
    <div className={styles.snippetWrap}>
      <div className={styles.snippetHeader}>
        <h3 className={styles.snippetTitle}>{title}</h3>
      </div>

      {setup ? (
        <section className={styles.block}>
          <div className={styles.blockHeader}>
            <span>Setup</span>
            <button className={styles.copyBtn} onClick={() => copy(setup)}>Copy</button>
          </div>
          <pre className={styles.pre}><code>{setup}</code></pre>
        </section>
      ) : null}

      <section className={styles.block}>
        <div className={styles.blockHeader}>
          <span>Code</span>
          <button className={styles.copyBtn} onClick={() => copy(code)}>Copy</button>
        </div>
        <pre className={styles.pre}><code>{code}</code></pre>
      </section>
    </div>
  );
}

/** ---------- UI STATE (exactly the docstring set) ---------- */
type UIOpts = {
  destination: string;            // str
  scenes: string;                 // None | int | list[int] -> "None" | "0" | "0,2"
  name: string;                   // str
  scale: string;                  // semicolon-separated tuples: "1,1,1,1,1;1,1,1,0.5,0.5"
  chunkShape: string;             // tuple OR semicolon list of tuples
  shardFactor: string;            // int tuple "1,1,1,1,1"
  compressor: string;             // raw python expr, e.g. "numcodecs.Blosc(cname='zstd', clevel=5)"
  zarrFormat: "" | "2" | "3";     // 2|3
  imageName: string;              // str
  axesNames: string;              // csv of strings
  axesTypes: string;              // csv of strings
  axesUnits: string;              // csv of strings or "None"
  physicalPixelSize: string;      // csv floats
  xyScale: string;                // csv floats
  zScale: string;                 // csv floats
  numLevels: string;              // int
  memoryTargetBytes: string;      // int (bytes)
  startTSrc: string;              // int
  startTDest: string;             // int
  tbatch: string;                 // int
  dtype: string;                  // str
  autoDask: boolean;              // bool
};

export default function ConvertToZarr({ onDismiss }: ModalProps) {
  const dispatch = useDispatch();
  const fileSelection = useSelector(selection.selectors.getFileSelection);
  const snippet = useSelector(interaction.selectors.getConvertFilesSnippet);

  const [opts, setOpts] = React.useState<UIOpts>({
    destination: "zarr_out",
    scenes: "",
    name: "",
    scale: "",
    chunkShape: "",
    shardFactor: "",
    compressor: "",
    zarrFormat: "",
    imageName: "",
    axesNames: "",
    axesTypes: "",
    axesUnits: "",
    physicalPixelSize: "",
    xyScale: "",
    zScale: "",
    numLevels: "",
    memoryTargetBytes: "",
    startTSrc: "",
    startTDest: "",
    tbatch: "",
    dtype: "",
    autoDask: false,
  });

  /** ---------- HELPERS ---------- */
  const safe = (s: string) => String(s ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const toInt = (v: string): string | null => (v.trim() ? String(parseInt(v.trim(), 10)) : null);

  const toPyTuple = (csv: string): string | null => {
    const t = (csv || "").trim();
    if (!t) return null;
    const parts = t.split(",").map(x => x.trim()).filter(Boolean);
    if (!parts.length) return null;
    const nums = parts.map(x => (/^[+-]?\d+(\.\d+)?$/.test(x) ? x : JSON.stringify(x)));
    return `(${nums.join(", ")})`;
  };

  const toSemicolonTupleListPy = (s: string): string | null => {
    const t = (s || "").trim();
    if (!t) return null;
    const groups = t.split(";").map(g => g.trim()).filter(Boolean).map(g => toPyTuple(g)).filter(Boolean) as string[];
    if (!groups.length) return null;
    return `[${groups.join(", ")}]`;
  };

  const toScenesPy = (s: string): string | null => {
    const v = (s || "").trim();
    if (!v) return null;
    if (/^none$/i.test(v)) return "None";
    if (/^\d+$/.test(v)) return String(parseInt(v, 10));
    const parts = v.split(",").map(x => x.trim()).filter(Boolean);
    if (parts.length && parts.every(p => /^\d+$/.test(p))) return `[${parts.join(", ")}]`;
    return null;
  };

  const toStrListPy = (csv: string): string | null => {
    const t = (csv || "").trim();
    if (!t) return null;
    const parts = t.split(",").map(x => x.trim()).filter(Boolean);
    if (!parts.length) return null;
    return `[${parts.map(x => (x.toLowerCase() === "none" ? "None" : JSON.stringify(x))).join(", ")}]`;
  };

  const toFloatListPy = (csv: string): string | null => {
    const t = (csv || "").trim();
    if (!t) return null;
    const parts = t.split(",").map(x => x.trim()).filter(Boolean);
    if (!parts.length) return null;
    const vals = parts.map(p => (p.match(/^[+-]?\d+(\.\d+)?$/) ? p : null));
    if (vals.some(v => v === null)) return null;
    return `[${(vals as string[]).join(", ")}]`;
  };

  /** Build DEFAULTS Python dict (only docstring params) */
  const buildDefaultsPy = (ui: UIOpts) => {
    const lines: string[] = [];

    // Required-ish destination
    const dest = (ui.destination || "zarr_out").trim();
    lines.push(`"destination": ${JSON.stringify(dest)},`);

    // scenes / name
    const scenesPy = toScenesPy(ui.scenes);
    if (scenesPy !== null) lines.push(`"scenes": ${scenesPy},`);
    if (ui.name.trim()) lines.push(`"name": ${JSON.stringify(ui.name.trim())},`);

    // scale (explicit) overrides helpers
    const scaleList = toSemicolonTupleListPy(ui.scale);
    if (scaleList) lines.push(`"scale": ${scaleList},`);

    // chunk shape: either one tuple or per-level tuples
    const chunkPerLevel = toSemicolonTupleListPy(ui.chunkShape);
    const chunkSingle = !chunkPerLevel ? toPyTuple(ui.chunkShape) : null;
    if (chunkPerLevel) lines.push(`"chunk_shape": ${chunkPerLevel},`); // per-level
    else if (chunkSingle) lines.push(`"chunk_shape": ${chunkSingle},`);

    // shard factor
    const shard = toPyTuple(ui.shardFactor);
    if (shard) lines.push(`"shard_factor": ${shard},`);

    // compressor (raw Python expression — user supplies valid expr)
    if (ui.compressor.trim()) lines.push(`"compressor": ${ui.compressor.trim()},`);

    // zarr_format
    if (ui.zarrFormat) lines.push(`"zarr_format": ${ui.zarrFormat},`);

    // image & axes
    if (ui.imageName.trim()) lines.push(`"image_name": ${JSON.stringify(ui.imageName.trim())},`);
    const axesNames = toStrListPy(ui.axesNames);
    if (axesNames) lines.push(`"axes_names": ${axesNames},`);
    const axesTypes = toStrListPy(ui.axesTypes);
    if (axesTypes) lines.push(`"axes_types": ${axesTypes},`);
    const axesUnits = toStrListPy(ui.axesUnits);
    if (axesUnits) lines.push(`"axes_units": ${axesUnits},`);

    // physical pixels
    const pps = toFloatListPy(ui.physicalPixelSize);
    if (pps) lines.push(`"physical_pixel_size": ${pps},`);

    // helpers (ignored if scale present)
    const xyPy = !scaleList ? toPyTuple(ui.xyScale) : null;
    if (xyPy) lines.push(`"xy_scale": ${xyPy},`);
    const zPy = !scaleList ? toPyTuple(ui.zScale) : null;
    if (zPy) lines.push(`"z_scale": ${zPy},`);
    const numLv = !scaleList ? toInt(ui.numLevels) : null;
    if (numLv) lines.push(`"num_levels": ${numLv},`);

    // memory / T indexing / batches
    const memBytes = toInt(ui.memoryTargetBytes);
    if (memBytes) lines.push(`"memory_target": ${memBytes},`);
    const startSrc = toInt(ui.startTSrc);
    if (startSrc) lines.push(`"start_T_src": ${startSrc},`);
    const startDst = toInt(ui.startTDest);
    if (startDst) lines.push(`"start_T_dest": ${startDst},`);
    const tb = toInt(ui.tbatch);
    if (tb) lines.push(`"tbatch": ${tb},`);

    // dtype
    if (ui.dtype.trim()) lines.push(`"dtype": ${JSON.stringify(ui.dtype.trim())},`);

    // auto dask
    if (ui.autoDask) lines.push(`"auto_dask_cluster": True,`);

    if (!lines.length) return "DEFAULTS = {}";
    const body = lines.map(l => `    ${l.replace(/,+\s*$/, ",")}`).join("\n");
    return `DEFAULTS = {\n${body}\n}`;
  };

  /** Optional: keep options object around (telemetry/debug) */
  const buildOptionsDict = (ui: UIOpts): Record<string, string> => {
    const d: Record<string, string> = {};
    if (ui.destination.trim()) d["destination"] = ui.destination.trim();
    if (ui.scenes.trim()) d["scenes"] = ui.scenes.trim();
    if (ui.name.trim()) d["name"] = ui.name.trim();
    if (ui.scale.trim()) d["scale"] = ui.scale.trim();
    if (ui.chunkShape.trim()) d["chunk-shape"] = ui.chunkShape.trim();
    if (ui.shardFactor.trim()) d["shard-factor"] = ui.shardFactor.trim();
    if (ui.compressor.trim()) d["compressor"] = ui.compressor.trim();
    if (ui.zarrFormat) d["zarr-format"] = ui.zarrFormat;
    if (ui.imageName.trim()) d["image-name"] = ui.imageName.trim();
    if (ui.axesNames.trim()) d["axes-names"] = ui.axesNames.trim();
    if (ui.axesTypes.trim()) d["axes-types"] = ui.axesTypes.trim();
    if (ui.axesUnits.trim()) d["axes-units"] = ui.axesUnits.trim();
    if (ui.physicalPixelSize.trim()) d["physical-pixel-size"] = ui.physicalPixelSize.trim();
    if (ui.xyScale.trim()) d["xy-scale"] = ui.xyScale.trim();
    if (ui.zScale.trim()) d["z-scale"] = ui.zScale.trim();
    if (ui.numLevels.trim()) d["num-levels"] = ui.numLevels.trim();
    if (ui.memoryTargetBytes.trim()) d["memory-target"] = ui.memoryTargetBytes.trim();
    if (ui.startTSrc.trim()) d["start-T-src"] = ui.startTSrc.trim();
    if (ui.startTDest.trim()) d["start-T-dest"] = ui.startTDest.trim();
    if (ui.tbatch.trim()) d["tbatch"] = ui.tbatch.trim();
    if (ui.dtype.trim()) d["dtype"] = ui.dtype.trim();
    if (ui.autoDask) d["auto-dask-cluster"] = "true";
    return d;
  };

  /** ---------- Selection + snippet gen ---------- */
  const detailsRef = React.useRef<Array<{ path: string }>>([]);
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
        // eslint-disable-next-line no-console
        console.error("Failed to generate convert-files snippet:", err);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, fileSelection]);

  const regenerate = React.useCallback((details: Array<{ path: string }>, ui: UIOpts) => {
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
          if (lower.endsWith(ext)) { pluginPkgs.add(pkg); break; }
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

    dispatch(setConvertFilesSnippet({ setup, code, options: buildOptionsDict(ui) }));
  }, [dispatch, buildDefaultsPy]);

  React.useEffect(() => {
    if (detailsRef.current.length) regenerate(detailsRef.current, opts);
  }, [opts, regenerate]);

  /** ---------- Handlers ---------- */
  const onChangeText =
    (key: keyof UIOpts) =>
    (_e: any, value?: string) =>
      setOpts((p) => ({ ...p, [key]: value ?? "" }));

  const onChangeDropdown =
    (key: keyof UIOpts) =>
    (_e: any, option?: IDropdownOption) =>
      setOpts((p) => ({ ...p, [key]: (option?.key as string) || "" }));

  const onChangeCheck =
    (key: keyof UIOpts) =>
    (_e: any, checked?: boolean) =>
      setOpts((p) => ({ ...p, [key]: !!checked }));

  /** ---------- BODY ---------- */
  const body = (
    <div
      className={styles.grid}
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) 420px",
        gap: 16,
        height: "70vh",
        width: "86vw",
        maxWidth: 1400,
      }}
    >
      {/* LEFT: Snippet */}
      <div className={styles.content} style={{ minWidth: 0 }}>
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <EmbeddedSnippet
            title="Convert to OME-Zarr — Python Snippet"
            setup={snippet?.setup}
            code={snippet?.code}
          />
        </div>
      </div>

      {/* RIGHT: Params (docstring set only) */}
      <div className={styles.sidebar} style={{ overflow: "auto", paddingLeft: 8 }}>
        <h4 className={styles.fieldLabel}>Destination directory</h4>
        <TextField className={styles.fieldInput} value={opts.destination} onChange={onChangeText("destination")} placeholder="zarr_out" />

        <h4 className={styles.fieldLabel}>Scenes</h4>
        <TextField className={styles.fieldInput} value={opts.scenes} onChange={onChangeText("scenes")} placeholder="None | 0 | 0,2" />

        <h4 className={styles.fieldLabel}>Name (base)</h4>
        <TextField className={styles.fieldInput} value={opts.name} onChange={onChangeText("name")} placeholder="defaults to source stem" />

        <h4 className={styles.fieldLabel}>scale (per-level; ';' separated)</h4>
        <TextField className={styles.fieldInput} value={opts.scale} onChange={onChangeText("scale")} placeholder="1,1,1,1,1;1,1,1,0.5,0.5" />

        <h4 className={styles.fieldLabel}>chunk_shape</h4>
        <TextField className={styles.fieldInput} value={opts.chunkShape} onChange={onChangeText("chunkShape")} placeholder="(e.g.) 1,1,16,256,256  or  per-level via ';'" />

        <h4 className={styles.fieldLabel}>shard_factor</h4>
        <TextField className={styles.fieldInput} value={opts.shardFactor} onChange={onChangeText("shardFactor")} placeholder="e.g. 1,1,1,1,1" />

        <h4 className={styles.fieldLabel}>compressor (Python expr)</h4>
        <TextField
          className={styles.fieldInput}
          value={opts.compressor}
          onChange={onChangeText("compressor")}
          placeholder={'numcodecs.Blosc(cname="zstd", clevel=5)'}
        />

        <h4 className={styles.fieldLabel}>Zarr format</h4>
        <Dropdown
          className={styles.dropdownInput}
          selectedKey={opts.zarrFormat}
          onChange={onChangeDropdown("zarrFormat")}
          options={[
            { key: "", text: "(writer default)" },
            { key: "3", text: "3 (NGFF 0.5)" },
            { key: "2", text: "2 (NGFF 0.4)" },
          ]}
        />

        <h4 className={styles.fieldLabel}>image_name</h4>
        <TextField className={styles.fieldInput} value={opts.imageName} onChange={onChangeText("imageName")} placeholder="(optional)" />

        <h4 className={styles.fieldLabel}>axes_names</h4>
        <TextField className={styles.fieldInput} value={opts.axesNames} onChange={onChangeText("axesNames")} placeholder='e.g. t,c,z,y,x' />

        <h4 className={styles.fieldLabel}>axes_types</h4>
        <TextField className={styles.fieldInput} value={opts.axesTypes} onChange={onChangeText("axesTypes")} placeholder='e.g. time,channel,space,space,space' />

        <h4 className={styles.fieldLabel}>axes_units</h4>
        <TextField className={styles.fieldInput} value={opts.axesUnits} onChange={onChangeText("axesUnits")} placeholder='e.g. s,None,um,um,um' />

        <h4 className={styles.fieldLabel}>physical_pixel_size</h4>
        <TextField className={styles.fieldInput} value={opts.physicalPixelSize} onChange={onChangeText("physicalPixelSize")} placeholder="floats per axis, e.g. 1,1,0.5,0.108,0.108" />

        <h4 className={styles.fieldLabel}>xy_scale (helpers)</h4>
        <TextField className={styles.fieldInput} value={opts.xyScale} onChange={onChangeText("xyScale")} placeholder="0.5,0.25" />

        <h4 className={styles.fieldLabel}>z_scale (helpers)</h4>
        <TextField className={styles.fieldInput} value={opts.zScale} onChange={onChangeText("zScale")} placeholder="1.0,0.5" />

        <h4 className={styles.fieldLabel}>num_levels (helpers)</h4>
        <TextField className={styles.fieldInput} value={opts.numLevels} onChange={onChangeText("numLevels")} placeholder="3" />

        <h4 className={styles.fieldLabel}>memory_target (bytes)</h4>
        <TextField className={styles.fieldInput} value={opts.memoryTargetBytes} onChange={onChangeText("memoryTargetBytes")} placeholder="16777216 (16MB)" />

        <h4 className={styles.fieldLabel}>start_T_src</h4>
        <TextField className={styles.fieldInput} value={opts.startTSrc} onChange={onChangeText("startTSrc")} placeholder="0" />

        <h4 className={styles.fieldLabel}>start_T_dest</h4>
        <TextField className={styles.fieldInput} value={opts.startTDest} onChange={onChangeText("startTDest")} placeholder="0" />

        <h4 className={styles.fieldLabel}>tbatch</h4>
        <TextField className={styles.fieldInput} value={opts.tbatch} onChange={onChangeText("tbatch")} placeholder="1" />

        <h4 className={styles.fieldLabel}>dtype</h4>
        <TextField className={styles.fieldInput} value={opts.dtype} onChange={onChangeText("dtype")} placeholder="e.g. uint16" />

        <Checkbox className={styles.checkboxRow} label="Auto Dask cluster" checked={opts.autoDask} onChange={onChangeCheck("autoDask")} />

        <div className={classNames(styles.footer, styles.footerAlignRight)}>
          <SecondaryButton title="" text="CLOSE" onClick={onDismiss} />
        </div>
      </div>
    </div>
  );

  return <BaseModal body={body} isStatic onDismiss={onDismiss} title="Convert files to OME-Zarr" />;
}
