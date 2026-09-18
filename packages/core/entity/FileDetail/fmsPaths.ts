import { Environment } from "../../constants";

export const AICS_FMS_S3_URL_PREFIX = "https://s3.us-west-2.amazonaws.com/";

export const AICS_FMS_S3_BUCKETS: Record<Environment, string> = {
    PRODUCTION: "production.files.allencell.org",
    STAGING: "staging.files.allencell.org",
    LOCALHOST: "",
    TEST: "test.files.allencell.org",
};

// Where the same files are mounted on the local NAS (VAST) in each environment.
export const NAS_HOST_PREFIXES: Record<Environment, string> = {
    LOCALHOST: "/tmp/fss/local",
    PRODUCTION: "/allen/programs/allencell/data/proj0",
    STAGING: "/allen/aics/software/apps/staging/fss/data",
    TEST: "/test",
};

function findEnvironmentForLocalPath(path: string): Environment | undefined {
    return (Object.keys(NAS_HOST_PREFIXES) as Environment[]).find((env) => {
        const prefix = NAS_HOST_PREFIXES[env];
        return path === prefix || path.startsWith(`${prefix}/`);
    });
}

// Remove the local NAS mount prefix
export function stripNasHostPrefix(path: string): string {
    const env = findEnvironmentForLocalPath(path);
    return env ? path.slice(NAS_HOST_PREFIXES[env].length) : path;
}

/**
 * Convert a full local NAS path to the equivalent FMS `file_path` value, or undefined if the
 * path does not start with a known NAS mount prefix.
 */
export function localPathToFmsFilePath(localPath: string): string | undefined {
    const env = findEnvironmentForLocalPath(localPath);
    if (!env) {
        return undefined;
    }
    return `${AICS_FMS_S3_BUCKETS[env]}${localPath.slice(NAS_HOST_PREFIXES[env].length)}`;
}
