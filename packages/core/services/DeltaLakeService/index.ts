import axios from "axios";
import S3StorageService from "../S3StorageService";

// Directory holding a Delta Lake table's transaction log, relative to the table root.
export const DELTA_LOG_DIR = "_delta_log";

// Commit files are named by zero-padded version to this width.
const VERSION_WIDTH = 20;

// Every data file becomes a DuckDB file handle and an HTTP range-request target,
// so a very wide table would lock up the browser. Fail loudly instead.
export const MAX_DELTA_DATA_FILES = 1000;

// Guard against walking forever if a server answers 200 to everything.
const MAX_COMMITS_TO_WALK = 10000;

// Statuses that mean "this log file does not exist". 404 is the obvious one;
// 403 is what S3 returns for a missing key when the bucket grants s3:GetObject
// but not s3:ListBucket, which is the usual setup for a public read-only bucket.
// Treating 403 as absent means a genuinely unreadable table reports "no data
// files found" rather than "access denied", which is the better trade: without
// it, every such table fails outright.
const MISSING_FILE_STATUSES = [403, 404];

/**
 * Reads a checkpoint parquet and returns its "add" action paths. Supplied by
 * DatabaseService, which owns the DuckDB connection; keeping it out of this
 * class leaves the service purely about transport.
 */
export type CheckpointReader = (checkpointUrl: string) => Promise<string[]>;

function stripTrailingSlashes(value: string): string {
    return value.replace(/\/+$/, "");
}

function commitFileName(version: number): string {
    return `${String(version).padStart(VERSION_WIDTH, "0")}.json`;
}

/**
 * Resolves the parquet files making up a Delta Lake table by replaying its
 * transaction log.
 *
 * Delta does not modify the parquet format: a table is a directory of ordinary
 * parquet data files plus a "_delta_log". DuckDB-wasm has no delta extension, so
 * we work out the file list ourselves and scan the data files directly.
 *
 * Everything here is a GET at a path the spec makes deterministic -- the log is
 * never listed. That is what lets a table hosted on a plain web server (nginx
 * with autoindex off, Azure blob, a CDN) work exactly like one on S3, and it is
 * also what makes the result correct: the log is the only thing that knows which
 * files a later UPDATE or DELETE superseded.
 *
 * Must stay free of DOM APIs: this runs inside the DuckDB web worker.
 */
export default class DeltaLakeService {
    private readonly readCheckpoint: CheckpointReader;
    private readonly s3StorageService: S3StorageService;

    /**
     * GET a log file. Returns null for 404, which is how the commit walk below
     * discovers it has reached the newest version.
     */
    private static async fetchLogFile(url: string): Promise<string | null> {
        try {
            const response = await axios.get(url, {
                // Commit files are newline-delimited JSON; axios would otherwise
                // try to parse the first line and hand back an object.
                transformResponse: (data) => data,
            });
            return typeof response.data === "string"
                ? response.data
                : JSON.stringify(response.data);
        } catch (err) {
            const status = axios.isAxiosError(err) ? err.response?.status : undefined;
            if (status !== undefined && MISSING_FILE_STATUSES.includes(status)) {
                return null;
            }
            throw err;
        }
    }

    /**
     * Parse a line of the transaction log, naming the file when it is not JSON --
     * a proxy or error page served with a 200 would otherwise surface as a bare
     * "Unexpected token <".
     */
    private static parseLogJson(raw: string, url: string): any {
        try {
            return JSON.parse(raw);
        } catch (err) {
            throw new Error(
                `"${url}" did not contain valid Delta Lake transaction log JSON. ` +
                    `Check that the URL points at a Delta Lake table and is not behind a ` +
                    `login or proxy.`
            );
        }
    }

    private static applyAction(
        action: {
            add?: { deletionVector?: Record<string, unknown>; path: string };
            remove?: { path: string };
            protocol?: { minReaderVersion: number };
            metaData?: { configuration?: Record<string, string> };
        },
        activePaths: Set<string>
    ): void {
        if ((action.protocol?.minReaderVersion || 0) >= 3) {
            throw new Error(
                `This Delta Lake table requires reader version ` +
                    `${action.protocol?.minReaderVersion || 0}, which this application does not ` +
                    `support. It likely uses deletion vectors or another table feature that ` +
                    `changes how data files are read.`
            );
        }
        if (
            action.metaData?.configuration?.["delta.columnMapping.mode"] === "id" ||
            action.metaData?.configuration?.["delta.columnMapping.mode"] === "name"
        ) {
            throw new Error(
                `This Delta Lake table uses column mapping, so its parquet columns are not ` +
                    `named the way the table is. This application cannot read it yet.`
            );
        }

        if (action.add) {
            if (action.add.deletionVector) {
                throw new Error(
                    `This Delta Lake table uses deletion vectors, so some rows in its parquet ` +
                        `files are marked deleted without being rewritten. This application ` +
                        `cannot read it yet.`
                );
            }
            activePaths.add(action.add.path);
        }
        if (action.remove) {
            activePaths.delete(action.remove.path);
        }
    }

    constructor(readCheckpoint: CheckpointReader, s3StorageService = new S3StorageService()) {
        this.readCheckpoint = readCheckpoint;
        this.s3StorageService = s3StorageService;
    }

    /**
     * True if the URL points at the root of a Delta Lake table.
     *
     * Checks for the two files every table has at a known path, rather than
     * listing the directory -- so this works against any static host.
     *
     * Returns false rather than throwing, so callers can fall back to treating
     * the URL as an ordinary file.
     */
    public async isDeltaTable(rootUrl: string): Promise<boolean> {
        let base;
        try {
            base = await this.toHttpBase(rootUrl);
        } catch (err) {
            return false;
        }

        for (const path of ["_last_checkpoint", commitFileName(0)]) {
            try {
                if (
                    (await DeltaLakeService.fetchLogFile(`${base}/${DELTA_LOG_DIR}/${path}`)) !==
                    null
                ) {
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
        const base = await this.toHttpBase(rootUrl);
        const logBase = `${base}/${DELTA_LOG_DIR}`;

        const { activePaths, nextVersion } = await this.seedFromCheckpoint(logBase);
        await this.applyCommits(logBase, nextVersion, activePaths);

        if (activePaths.size === 0) {
            throw new Error(
                `No parquet data files were found in the Delta Lake table at "${rootUrl}".`
            );
        }
        // Paths in the log are already percent-encoded per the Delta protocol,
        // so they append to the base URL as-is.
        return [...activePaths].map((path) => `${base}/${path}`);
    }

    /**
     * A checkpoint summarizes every action up to its version, which is what makes
     * a long-lived table readable at all: once commits age out, the JSON files
     * before the checkpoint are deleted.
     */
    private async seedFromCheckpoint(
        logBase: string
    ): Promise<{ activePaths: Set<string>; nextVersion: number }> {
        const raw = await DeltaLakeService.fetchLogFile(`${logBase}/_last_checkpoint`);
        if (raw === null) {
            return { activePaths: new Set(), nextVersion: 0 };
        }

        const { version, parts, v } = DeltaLakeService.parseLogJson(
            raw,
            `${logBase}/_last_checkpoint`
        );
        if (parts !== undefined && parts !== null && parts > 1) {
            throw new Error(
                `This Delta Lake table uses a multi-part checkpoint, which this application ` +
                    `cannot read yet.`
            );
        }
        if (v !== undefined && v >= 2) {
            throw new Error(
                `This Delta Lake table uses a v2 checkpoint, which this application cannot ` +
                    `read yet.`
            );
        }

        const paths = await this.readCheckpoint(
            `${logBase}/${String(version).padStart(VERSION_WIDTH, "0")}.checkpoint.parquet`
        );
        if (paths.length > MAX_DELTA_DATA_FILES) {
            throw new Error(
                `This Delta Lake table contains more than ${MAX_DELTA_DATA_FILES} parquet ` +
                    `files, more than this application can load at once. Consider compacting ` +
                    `the table.`
            );
        }

        // Tombstones are already excluded from a checkpoint's add actions, so the
        // add paths alone are the snapshot as of this version.
        return { activePaths: new Set(paths), nextVersion: version + 1 };
    }

    /**
     * Walk commit files upward from `fromVersion`, applying each action, until one
     * is missing -- that gap is the end of the log.
     */
    private async applyCommits(
        logBase: string,
        fromVersion: number,
        activePaths: Set<string>
    ): Promise<void> {
        for (let version = fromVersion; version < fromVersion + MAX_COMMITS_TO_WALK; version++) {
            const body = await DeltaLakeService.fetchLogFile(
                `${logBase}/${commitFileName(version)}`
            );
            if (body === null) {
                if (version === 0) {
                    throw new Error(
                        `The Delta Lake transaction log at "${logBase}" could not be read from ` +
                            `the beginning. This usually means older commits have been cleaned ` +
                            `up and the table can only be read via its checkpoint.`
                    );
                }
                return;
            }

            for (const line of body.split("\n")) {
                if (line.trim() === "") {
                    continue;
                }
                DeltaLakeService.applyAction(
                    DeltaLakeService.parseLogJson(line, `${logBase}/${commitFileName(version)}`),
                    activePaths
                );
                if (activePaths.size > MAX_DELTA_DATA_FILES) {
                    throw new Error(
                        `This Delta Lake table contains more than ${MAX_DELTA_DATA_FILES} ` +
                            `parquet files, more than this application can load at once. ` +
                            `Consider compacting the table.`
                    );
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
    private async toHttpBase(rootUrl: string): Promise<string> {
        // An http(s) URL is already addressable, and must be left alone: asking
        // S3StorageService to parse it costs a directory-listing probe, which a
        // plain web server answers with 403/404 -- and losing that URL is exactly
        // the case (nginx, Azure blob, a CDN) this reader exists to support.
        if (/^https?:/i.test(rootUrl)) {
            return stripTrailingSlashes(rootUrl);
        }

        // s3: URLs are not fetchable by the browser, so address the bucket over
        // https. formatAsHttpResource encodes the key per path segment, so the
        // slashes survive and the result stays joinable.
        const base = await this.s3StorageService.formatAsHttpResource(rootUrl);
        if (!base) {
            throw new Error(`Unable to resolve "${rootUrl}" to an addressable URL.`);
        }
        return stripTrailingSlashes(base);
    }
}
