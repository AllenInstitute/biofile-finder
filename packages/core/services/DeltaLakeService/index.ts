import axios, { AxiosInstance } from "axios";
import { isEmpty, isNil } from "lodash";

import S3StorageService from "../S3StorageService";

// Every data file becomes a DuckDB file handle and an HTTP range-request target,
// so a very wide table would lock up the browser. Fail loudly instead.
export const MAX_DELTA_DATA_FILES = 1000;

// Directory holding a Delta Lake table's transaction log, relative to the table root.
const DELTA_LOG_DIR = "_delta_log";

// Guard against walking forever if a server answers 200 to everything.
const MAX_COMMITS_TO_WALK = 10000;

// Reads a checkpoint parquet and returns its actions.
type CheckpointReader = (checkpointUrl: string) => Promise<DeltaAction[]>;

// Version information extracted from a Delta Lake checkpoint parquet file.
interface CheckpointVersionInfo {
    version: number;
    parts?: number;
    v?: number;
}

// A Delta Lake transaction log is a sequence of JSON lines, each of which is an "action".
export interface DeltaAction {
    add?: { deletionVector?: Record<string, unknown>; path: string };
    remove?: { path: string };
    protocol?: { minReaderVersion: number };
    metaData?: { configuration?: Record<string, string> | Map<string, string> };
}

/**
 * True if a log path names its own location rather than one relative to the table.
 */
function isAbsoluteUri(path: string): boolean {
    return /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(path);
}

// Pads a version number to the fixed width used in Delta Lake file names.
// Delta Lake are always 20 characters wide, so pad with leading zeros to that width.
function padToVersionWidth(version: number): string {
    return String(version).padStart(20, "0");
}

/**
 * Parse a line of the transaction log.
 * Catches errors and wraps them in a more useful message.
 */
function parseJson<T = Record<string, unknown>>(stringifiedJson: string, sourceUrl: string): T {
    try {
        return JSON.parse(stringifiedJson);
    } catch (err) {
        throw new Error(`"${sourceUrl}" did not contain valid Delta Lake transaction log JSON.`);
    }
}

/**
 * A Delta Lake table is a directory of ordinary parquet data files
 * plus a "_delta_log". DuckDB-wasm has no delta extension, so
 * we work out the file list ourselves and scan the data files directly.
 */
export default class DeltaLakeService {
    private readonly httpClient: AxiosInstance;
    private readonly readCheckpoint: CheckpointReader;
    private readonly s3StorageService: S3StorageService;

    /**
     * Reject an action that uses a feature this reader cannot honour.
     */
    private static assertSupported(action: DeltaAction): void {
        const readerVersion = action.protocol?.minReaderVersion || 0;
        if (readerVersion >= 3) {
            throw new Error(
                `This Delta Lake table requires reader version ` +
                    `${readerVersion}, which this application does not support.`
            );
        }
        if (action.metaData?.configuration) {
            const columnMapping =
                action.metaData?.configuration instanceof Map
                    ? action.metaData.configuration.get("delta.columnMapping.mode")
                    : action.metaData.configuration["delta.columnMapping.mode"];
            if (columnMapping === "id" || columnMapping === "name") {
                throw new Error(
                    `This Delta Lake table uses column mapping, so its parquet columns are not ` +
                        `named the way the table is. This application cannot read it yet.`
                );
            }
        }
        if (action.add?.deletionVector) {
            throw new Error(
                `This Delta Lake table uses deletion vectors, so some rows in its parquet ` +
                    `files are marked deleted without being rewritten. This application ` +
                    `cannot read it yet.`
            );
        }
    }

    private static parseAction(
        rawAction: string,
        sourceUrl: string
    ): { type: "add" | "remove"; path: string } | null {
        const action = parseJson<DeltaAction>(rawAction, sourceUrl);
        DeltaLakeService.assertSupported(action);

        if (action.add) {
            return { type: "add", path: action.add.path };
        }
        if (action.remove) {
            return { type: "remove", path: action.remove.path };
        }

        return null;
    }

    constructor(
        httpClient: AxiosInstance,
        readCheckpoint: CheckpointReader,
        s3StorageService?: S3StorageService
    ) {
        this.httpClient = httpClient;
        this.readCheckpoint = readCheckpoint;
        this.s3StorageService = s3StorageService || new S3StorageService({ httpClient });
    }

    /**
     * True if the URL points at the root of a Delta Lake table
     * based on presense of _delta_log/_last_checkpoint file
     */
    public async isDeltaTable(rootUrl: string): Promise<boolean> {
        let base;
        try {
            base = await this.toHttpBase(rootUrl);
        } catch (err) {
            return false;
        }

        const firstCommitFile = `${padToVersionWidth(0)}.json`;
        for (const path of ["_last_checkpoint", firstCommitFile]) {
            try {
                if ((await this.fetchJsonString(`${base}/${DELTA_LOG_DIR}/${path}`)) !== null) {
                    return true;
                }
            } catch (err) {
                return false;
            }
        }
        return false;
    }

    /**
     * The parquet data files making up the table's current snapshot, as URLs.
     */
    public async listDataFiles(rootUrl: string): Promise<string[]> {
        const baseUrl = await this.toHttpBase(rootUrl);
        const logUrl = `${baseUrl}/${DELTA_LOG_DIR}`;

        const { activePaths, nextVersion } = await this.seedFromCheckpoint(logUrl);
        await this.applyCommits(logUrl, nextVersion, activePaths);

        if (isEmpty(activePaths)) {
            throw new Error(
                `No parquet data files were found in the Delta Lake table at "${rootUrl}".`
            );
        }
        if (activePaths.size > MAX_DELTA_DATA_FILES) {
            throw new Error(
                `This Delta Lake table contains more than ${MAX_DELTA_DATA_FILES} ` +
                    `parquet files, more than this application can load at once. ` +
                    `Consider compacting the table.`
            );
        }
        return Promise.all(
            [...activePaths].map((path) =>
                isAbsoluteUri(path) ? this.toHttpBase(path, false) : `${baseUrl}/${path}`
            )
        );
    }

    /**
     * A checkpoint summarizes every action up to its version, which is what makes
     * a long-lived table readable at all: once commits age out, the JSON files
     * before the checkpoint are deleted.
     */
    private async seedFromCheckpoint(
        logBase: string
    ): Promise<{ activePaths: Set<string>; nextVersion: number }> {
        const version = await this.fetchCheckpointVersion(logBase);
        if (isNil(version)) return { activePaths: new Set(), nextVersion: 0 };

        const activePaths = new Set<string>();
        const checkpointUrl = `${logBase}/${padToVersionWidth(version)}.checkpoint.parquet`;
        for (const action of await this.readCheckpoint(checkpointUrl)) {
            DeltaLakeService.assertSupported(action);
            if (action.add) activePaths.add(action.add.path);
        }
        return { activePaths, nextVersion: version + 1 };
    }

    /**
     * Fetch a checkpoint file and return its version and any other metadata.
     * Returns null if no checkpoint exists.
     */
    private async fetchCheckpointVersion(logBase: string): Promise<number | null> {
        const checkpointUrl = `${logBase}/_last_checkpoint`;
        const raw = await this.fetchJsonString(checkpointUrl);
        if (isNil(raw)) return null;

        const { version, parts, v } = parseJson<CheckpointVersionInfo>(raw, checkpointUrl);
        if (!isNil(parts)) {
            throw new Error(
                "This Delta Lake table uses a multi-part checkpoint, which this application cannot read."
            );
        }
        if (!isNil(v) && v >= 2) {
            throw new Error(
                "This Delta Lake table uses a v2 checkpoint, which this application cannot read."
            );
        }
        return version;
    }

    /**
     * Walk commit files upward from `fromVersion`.
     * Applies each action, until one is missing.
     */
    private async applyCommits(
        logBase: string,
        fromVersion: number,
        activePaths: Set<string>
    ): Promise<void> {
        for (let version = fromVersion; version <= fromVersion + MAX_COMMITS_TO_WALK; version++) {
            const body = await this.fetchJsonString(
                `${logBase}/${padToVersionWidth(version)}.json`
            );

            // Exit-case: the log has no more commits, so the snapshot is complete.
            if (isNil(body)) {
                if (version === 0) {
                    throw new Error(
                        `The Delta Lake transaction log at "${logBase}" could not be read from ` +
                            `the beginning. This usually means older commits have been cleaned ` +
                            `up and the table can only be read via its checkpoint.`
                    );
                }
                return;
            }

            // Iterative-case: apply each action in the commit to the active set of data files.
            for (const line of body.split("\n")) {
                if (isEmpty(line.trim())) continue;

                const action = DeltaLakeService.parseAction(
                    line,
                    `${logBase}/${padToVersionWidth(version)}.json`
                );
                if (action?.type === "add") {
                    activePaths.add(action.path);
                } else if (action?.type === "remove") {
                    activePaths.delete(action.path);
                }
            }
        }

        throw new Error(
            `The Delta Lake transaction log at "${logBase}" has more than ` +
                `${MAX_COMMITS_TO_WALK} commits after its last checkpoint.`
        );
    }

    /**
     * Normalize a table root into an https base that child paths append to.
     */
    private async toHttpBase(url: string, replaceTrailingSlashes = true): Promise<string> {
        // Convert to an addressable URL, which may involve S3 presigned URLs or other transformations.
        let urlAsHttp = await this.s3StorageService.formatAsHttpResource(url);
        if (isNil(urlAsHttp)) {
            if (!url.startsWith("https://") && !url.startsWith("http://")) {
                throw new Error(`Unable to resolve "${url}" to an addressable URL.`);
            }
            // If the S3StorageService cannot resolve the URL, fall back to using it as-is if it is already an http(s) URL.
            urlAsHttp = url;
        }
        if (replaceTrailingSlashes) return urlAsHttp.replace(/\/+$/, "");
        return urlAsHttp;
    }

    /**
     * GET a log file.
     *
     * Returns null for missing file, which is how the commit walk below
     * discovers it has reached the newest version.
     */
    private async fetchJsonString(url: string): Promise<string | null> {
        try {
            const response = await this.httpClient.get(url, {
                // Avoid axios trying to parse the first line and hand back an object.
                transformResponse: (data) => data,
            });
            return typeof response.data === "string"
                ? response.data
                : JSON.stringify(response.data);
        } catch (err) {
            const status = axios.isAxiosError(err) ? err.response?.status : undefined;
            if (status !== undefined && [403, 404].includes(status)) {
                return null;
            }
            throw err;
        }
    }
}
