// This conditional import is due to to this unresolved error:
// https://github.com/AllenInstitute/biofile-finder/issues/178
// where the zarrita package produces "Exception during run: Error: No "exports" main
// defined in /zarrita/package.json" during test runs.
// This seems to either be due to a problem with the zarrita package
// or a problem with the way mocha resolves the zarrita package. Either way after trying out
// various solutions like changing Node versions, ts config settings, and package.json settings
// I am timeboxing this issue and moving on to the next task. - Sean M 08/30/2024
// The same issue occurs with omezarr. Applying the same workaround - Will Moore October 2025
let omezarr: any;
const isInTest = typeof global.it === "function";
if (isInTest) {
    omezarr = {};
} else {
    import("ome-zarr.js").then((module) => {
        omezarr = module;
    });
}

/**
 * Helper function to handle retry logic with timeout for async operations.
 * It retries the operation up to the specified number of times and aborts if it takes too long.
 */
async function retryWithTimeout<T>(fn: () => Promise<T>, retries = 3, timeout = 5000): Promise<T> {
    let attempt = 0;
    while (attempt < retries) {
        try {
            return await withTimeout(fn(), timeout);
        } catch (error) {
            attempt++;
            console.warn(`Attempt ${attempt} failed. Retrying...`, error);
            if (attempt >= retries) {
                throw new Error(`Operation failed after ${retries} attempts: ${error}`);
            }
        }
    }
    throw new Error("Unexpected error in retry logic");
}

/**
 * Helper function to enforce a timeout on async operations.
 */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
    );
    return Promise.race([promise, timeout]);
}

/**
 * Main function to attempt to render a usable thumbnail using the lowest
 * resolution present in a zarr image's metadata.
 */
export async function renderZarrThumbnailURL(
    zarrUrl: string,
    targetSize: number | undefined
): Promise<string | undefined> {
    try {
        return await retryWithTimeout(
            async () => {
                // if targetSize is undefined, the smallest resolution will be used
                return omezarr.renderThumbnail(zarrUrl, targetSize, true);
            },
            3,
            5000
        );
    } catch (error) {
        console.error("Failed to render Zarr thumbnail after 3 attempts:", error);
        return undefined; // Return undefined if all attempts fail
    }
}
