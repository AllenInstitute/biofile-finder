import axios from "axios";
import { parseS3Url } from "amazon-s3-url";

type DeltaLogObject = {
    add?: {
        path?: string;
    };
    remove?: {
        path?: string;
    };
};

export type DeltaResolverIO = {
    fetchText?: (url: string) => Promise<string>;
    listDeltaLogJsonFiles?: (rootUri: string) => Promise<string[]>;
};

function stripQueryAndFragment(uri: string): string {
    return uri.split(/[?#]/)[0];
}

function stripTrailingSlash(uri: string): string {
    return uri.replace(/\/+$/, "");
}

function pathJoin(base: string, child: string): string {
    const normalizedChild = child.replace(/^\.\//, "").replace(/^\//, "");
    return `${stripTrailingSlash(base)}/${normalizedChild}`;
}

function parseVersionFromDeltaLogFile(uri: string): number {
    const filename = stripQueryAndFragment(uri).split("/").pop() || "";
    const match = filename.match(/^(\d+)\.json$/);
    if (!match) {
        return Number.MAX_SAFE_INTEGER;
    }
    return Number(match[1]);
}

function isHttpUrl(uri: string): boolean {
    return /^https?:\/\//i.test(uri);
}

function isS3ProtocolUrl(uri: string): boolean {
    return /^s3:\/\//i.test(uri);
}

function isS3HttpUrl(uri: string): boolean {
    return isHttpUrl(uri) && uri.includes("amazonaws.com");
}

function getS3HostBucketAndPrefix(
    rootUri: string
): { host: string; bucket: string; prefix: string } {
    if (isS3ProtocolUrl(rootUri)) {
        const parsed = parseS3Url(rootUri);
        return {
            host: `s3.${parsed.region ? `${parsed.region}.` : ""}amazonaws.com`,
            bucket: parsed.bucket,
            prefix: parsed.key,
        };
    }

    const url = new URL(rootUri);
    const parsed = parseS3Url(rootUri);
    const normalizedPath = url.pathname.replace(/^\/+/, "");

    if (parsed.bucket && url.hostname.startsWith(`${parsed.bucket}.`)) {
        return {
            host: url.hostname.slice(parsed.bucket.length + 1),
            bucket: parsed.bucket,
            prefix: parsed.key || "",
        };
    }

    const [bucketFromPath, ...restPath] = normalizedPath.split("/");
    return {
        host: url.hostname,
        bucket: parsed.bucket || bucketFromPath,
        prefix: parsed.key || restPath.join("/"),
    };
}

function normalizeTableRootUri(rootUri: string): string {
    const normalized = stripTrailingSlash(stripQueryAndFragment(rootUri));
    if (normalized.endsWith("/_delta_log")) {
        return normalized.slice(0, -"/_delta_log".length);
    }
    return normalized;
}

function toHttpsTableRootUri(rootUri: string): string {
    if (isHttpUrl(rootUri)) {
        return normalizeTableRootUri(rootUri);
    }

    if (isS3ProtocolUrl(rootUri)) {
        const { host, bucket, prefix } = getS3HostBucketAndPrefix(rootUri);
        const tableRoot = `https://${host}/${bucket}${prefix ? `/${prefix}` : ""}`;
        return normalizeTableRootUri(tableRoot);
    }

    return normalizeTableRootUri(rootUri);
}

function buildDeltaLogDir(tableRootUri: string): string {
    return `${stripTrailingSlash(tableRootUri)}/_delta_log`;
}

function buildDeltaLogVersionFileUrl(deltaLogDir: string, version: number): string {
    return `${stripTrailingSlash(deltaLogDir)}/${String(version).padStart(20, "0")}.json`;
}

function isMissingObjectError(err: unknown): boolean {
    const status = (err as any)?.response?.status;
    if (status === 404 || status === 403) {
        return true;
    }

    const message = String((err as any)?.message || err || "").toLowerCase();
    return (
        message.includes("404") ||
        message.includes("nosuchkey") ||
        message.includes("not found") ||
        message.includes("accessdenied")
    );
}

function parseLastCheckpointVersion(rawCheckpoint: string): number | null {
    try {
        const parsed = JSON.parse(rawCheckpoint) as { version?: number };
        return typeof parsed.version === "number" ? parsed.version : null;
    } catch (_err) {
        return null;
    }
}

export default class DeltaTableService {
    private readonly fetchText: (url: string) => Promise<string>;
    private readonly listDeltaLogJsonFiles: (rootUri: string) => Promise<string[]>;

    constructor(io: DeltaResolverIO = {}) {
        this.fetchText =
            io.fetchText ||
            (async (url: string) => {
                const response = await axios.get(url, { responseType: "text" });
                return response.data as string;
            });

        this.listDeltaLogJsonFiles = io.listDeltaLogJsonFiles || this.listDeltaLogJsonFilesDefault;
    }

    public async isDeltaTableRoot(rootUri: string): Promise<boolean> {
        try {
            const normalizedRootUri = toHttpsTableRootUri(rootUri);
            const logFiles = await this.listDeltaLogJsonFiles(normalizedRootUri);
            return logFiles.length > 0;
        } catch (_err) {
            return false;
        }
    }

    public async resolveActiveParquetFiles(rootUri: string): Promise<string[]> {
        const normalizedRootUri = toHttpsTableRootUri(rootUri);
        const logFiles = await this.listDeltaLogJsonFiles(normalizedRootUri);
        if (logFiles.length === 0) {
            throw new Error(`No delta log JSON files found at ${normalizedRootUri}/_delta_log`);
        }

        const sortedLogFiles = [...logFiles].sort(
            (a, b) => parseVersionFromDeltaLogFile(a) - parseVersionFromDeltaLogFile(b)
        );

        const activeFiles = new Set<string>();

        for (const logFile of sortedLogFiles) {
            const rawText = await this.fetchText(logFile);
            const lines = rawText
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter(Boolean);

            for (const line of lines) {
                let parsed: DeltaLogObject;
                try {
                    parsed = JSON.parse(line) as DeltaLogObject;
                } catch (err) {
                    throw new Error(
                        `Invalid delta log JSON line in ${logFile}: ${line.slice(0, 120)}`
                    );
                }

                const addedPath = parsed.add?.path;
                if (addedPath) {
                    const resolvedPath = isHttpUrl(addedPath)
                        ? addedPath
                        : pathJoin(normalizedRootUri, addedPath);
                    activeFiles.add(encodeURI(resolvedPath));
                }

                const removedPath = parsed.remove?.path;
                if (removedPath) {
                    const resolvedPath = isHttpUrl(removedPath)
                        ? removedPath
                        : pathJoin(normalizedRootUri, removedPath);
                    activeFiles.delete(encodeURI(resolvedPath));
                }
            }
        }

        return [...activeFiles].sort();
    }

    private listDeltaLogJsonFilesDefault = async (rootUri: string): Promise<string[]> => {
        if (!(isS3ProtocolUrl(rootUri) || isS3HttpUrl(rootUri))) {
            throw new Error(
                `Listing delta logs is currently supported only for S3 URLs. Received: ${rootUri}`
            );
        }

        const tableRootUri = toHttpsTableRootUri(rootUri);
        const deltaLogDir = buildDeltaLogDir(tableRootUri);
        const existenceCache = new Map<number, boolean>();

        const fetchTextIfExists = async (url: string): Promise<string | null> => {
            try {
                return await this.fetchText(url);
            } catch (err) {
                if (isMissingObjectError(err)) {
                    return null;
                }
                throw err;
            }
        };

        const hasLogVersion = async (version: number): Promise<boolean> => {
            if (existenceCache.has(version)) {
                return existenceCache.get(version) as boolean;
            }

            const raw = await fetchTextIfExists(buildDeltaLogVersionFileUrl(deltaLogDir, version));
            const exists = raw !== null;
            existenceCache.set(version, exists);
            return exists;
        };

        const rawCheckpoint = await fetchTextIfExists(`${deltaLogDir}/_last_checkpoint`);
        const checkpointVersion = rawCheckpoint ? parseLastCheckpointVersion(rawCheckpoint) : null;

        let low = -1;
        let high = 1;

        if (checkpointVersion !== null && (await hasLogVersion(checkpointVersion))) {
            low = checkpointVersion;
            high = checkpointVersion + 1;
        } else if (await hasLogVersion(0)) {
            low = 0;
            high = 1;
        } else {
            return [];
        }

        while (await hasLogVersion(high)) {
            low = high;
            high *= 2;
        }

        while (low + 1 < high) {
            const mid = Math.floor((low + high) / 2);
            if (await hasLogVersion(mid)) {
                low = mid;
            } else {
                high = mid;
            }
        }

        const latestVersion = low;
        const files: string[] = [];
        for (let version = 0; version <= latestVersion; version++) {
            if (await hasLogVersion(version)) {
                files.push(encodeURI(buildDeltaLogVersionFileUrl(deltaLogDir, version)));
            }
        }

        return files;
    };
}
