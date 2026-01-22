export type PluginMap = ReadonlyArray<readonly [extLower: string, pkg: string]>;

/** Default mapping from file extension to the bioio plugin package. */
export const DEFAULT_PLUGIN_MAP: PluginMap = [
    [".ome.tiff", "bioio-ome-tiff"],
    [".ome.tif", "bioio-ome-tiff"],
    [".tiff", "bioio-ome-tiff"],
    [".tif", "bioio-ome-tiff"],
    [".czi", "bioio-czi"],
    [".nd2", "bioio-nd2"],
    [".lif", "bioio-lif"],
    [".sldy", "bioio-sldy"],
    [".ome.zarr", "bioio-ome-zarr"],
    [".zarr", "bioio-ome-zarr"],
] as const;

/**
 * Detects all bioio plugin packages required to handle the given file paths.
 *
 * Returns a **sorted unique list** of plugin package names.
 */
export function detectBioioPlugins(
    paths: readonly string[],
    map: PluginMap = DEFAULT_PLUGIN_MAP
): string[] {
    const out = new Set<string>();

    for (const p of paths) {
        const lower = String(p).toLowerCase();
        for (const [ext, pkg] of map) {
            if (lower.endsWith(ext)) {
                out.add(pkg);
                break;
            }
        }
    }

    return Array.from(out).sort();
}
