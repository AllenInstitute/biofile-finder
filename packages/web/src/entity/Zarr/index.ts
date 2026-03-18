/**
 * Entity wrapper for grabbing files within a Zarr (v2 or v3)
 */
export default class Zarr {
    public readonly path: string;
    private zarrVersion: number | undefined;

    private static joinUrl(root: string, relativePath: string): string {
        return `${root.replace(/\/+$/, "")}/${relativePath.replace(/^\/+/, "")}`;
    }

    private static async fetchJSON(
        path: string,
        missingOk = false
    ): Promise<Record<string, any> | undefined> {
        const res = await fetch(path);
        if (!res.ok) {
            if (missingOk) return undefined;
            throw new Error(`Expected to find a metadata file for the Zarr at ${path}`);
        }
        return res.json();
    }

    private static async isFilePresent(path: string): Promise<boolean> {
        const res = await fetch(path, {
            method: "HEAD", // Using HEAD is more efficient as it doesn't download the body
        });
        return res.ok;
    }

    private static *getCoordinates(
        chunkCounts: number[],
        dims: number,
        dim = 0,
        prefix: number[] = []
    ): Generator<number[]> {
        if (dim === dims) {
            yield prefix;
        } else {
            for (let i = 0; i < chunkCounts[dim]; i++) {
                yield* Zarr.getCoordinates(chunkCounts, dims, dim + 1, [...prefix, i]);
            }
        }
    }

    constructor(path: string) {
        this.path = path;
    }

    /**
     * Enumerate all files in a Zarr v2 or v3 store
     *
     * Yields paths relative to the store root.
     */
    public async *getRelativeFilePaths(): AsyncGenerator<string> {
        // Get root level metadata, necessary to know the dataset multiscales
        // and determine the zarr version
        this.zarrVersion = 3;
        let rootMetaPath: string;
        let rootMeta: Record<string, any> | undefined;
        [rootMetaPath, rootMeta] = await this.getMetadataForLevel("", true, true);
        if (rootMeta === undefined) {
            this.zarrVersion = 2;
            [rootMetaPath, rootMeta] = await this.getMetadataForLevel("", true, true);
            if (rootMeta === undefined) {
                throw new Error("Could not find root metadata file for .zarr");
            }
        }

        // Yield whichever path we actually found
        yield rootMetaPath;

        // Check if .zgroup & if present yield it
        const zgroupPath = ".zgroup";
        if (
            this.zarrVersion === 2 &&
            (await Zarr.isFilePresent(Zarr.joinUrl(this.path, zgroupPath)))
        ) {
            yield zgroupPath;
        }

        // Check for labels and iterate over any found
        const labelsPath = "labels/zarr.json";
        const labelsMetadata = await Zarr.fetchJSON(Zarr.joinUrl(this.path, labelsPath), true);
        if (labelsMetadata) {
            yield labelsPath;
            const labels: string[] = labelsMetadata.attributes?.ome?.labels || [];
            for (const label of labels) {
                yield* this.getFilesAtPath(`labels/${label}`);
            }
        }

        // Iterate over coordinate datasets yielding any files found
        const datasets =
            rootMeta.multiscales?.[0].datasets || rootMeta.attributes.ome.multiscales[0].datasets;
        for (const dataset of datasets) {
            yield* this.getFilesAtPath(dataset.path);
        }
    }

    /**
     * Given a path inside a Zarr to a dataset or other coordinate directory (ex. labels)
     * gather up any files found
     */
    private async *getFilesAtPath(path: string): AsyncGenerator<string> {
        const [arrayMetaPath, arrayMeta] = (await this.getMetadataForLevel(path)) as [
            string,
            Record<string, any>
        ];
        yield arrayMetaPath;

        // For v3 groups (for example label groups), recurse into dataset paths
        const childDatasets =
            arrayMeta.multiscales?.[0]?.datasets ||
            arrayMeta.attributes?.ome?.multiscales?.[0]?.datasets;
        if (Array.isArray(childDatasets)) {
            for (const dataset of childDatasets) {
                const childPath = [path, `${dataset.path || ""}`.replace(/^\/+/, "")]
                    .filter(Boolean)
                    .join("/");
                yield* this.getFilesAtPath(childPath);
            }
            return;
        }

        // Check if .zattrs & if present yield it
        const zattrsPath = `${path}/.zattrs`;
        if (
            this.zarrVersion === 2 &&
            (await Zarr.isFilePresent(Zarr.joinUrl(this.path, zattrsPath)))
        ) {
            yield zattrsPath;
        }

        // Determine count of each chunk
        const shape: number[] = arrayMeta.shape;
        const chunks: number[] =
            arrayMeta.chunks || arrayMeta.chunk_grid?.configuration?.chunk_shape;
        if (!shape || !chunks) {
            throw new Error(
                `Unable to determine chunk layout for Zarr path '${path}'. Expected array metadata with shape and chunks.`
            );
        }
        const chunkCounts = shape.map((d, i) => Math.ceil(d / chunks[i]));

        // Determine the separator used for the coordinate locations
        let sep = "/";
        const encoding = arrayMeta.chunk_key_encoding;
        if (encoding?.name === "default" && encoding?.configuration?.separator) {
            sep = encoding.configuration?.separator;
        }

        // Iterate over coordinates adding them to the downloader asynchronously
        for (const coord of Zarr.getCoordinates(chunkCounts, shape.length)) {
            if (this.zarrVersion === 3) {
                yield `${path}${sep}c${sep}${coord.join(sep)}`;
            } else {
                yield `${path}${sep}${coord.join(sep)}`;
            }
        }
    }

    /**
     * Grab the metadata for the specific zarr level
     */
    private async getMetadataForLevel(
        levelPath: string,
        isGroup = false,
        missingOk = false
    ): Promise<[string, Record<string, any> | undefined]> {
        let metadataFileName: string;
        if (this.zarrVersion === 2) {
            metadataFileName = isGroup ? ".zattrs" : ".zarray";
        } else if (this.zarrVersion === 3) {
            metadataFileName = "zarr.json";
        } else {
            throw new Error(
                `Only able to download version 2 or 3 .zarr files, detected ${this.zarrVersion}`
            );
        }

        const normalizedLevelPath = levelPath.replace(/^\/+|\/+$/g, "");
        const metadataPath = normalizedLevelPath
            ? `${normalizedLevelPath}/${metadataFileName}`
            : metadataFileName;
        const metadata = await Zarr.fetchJSON(Zarr.joinUrl(this.path, metadataPath), missingOk);
        return [metadataPath, metadata];
    }
}
