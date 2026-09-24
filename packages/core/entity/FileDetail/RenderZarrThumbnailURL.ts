// This conditional import is due to to this unresolved error:
// https://github.com/AllenInstitute/biofile-finder/issues/178
// where the zarrita package produces "Exception during run: Error: No "exports" main
// defined in /zarrita/package.json" during test runs.
// This seems to either be due to a problem with the zarrita package
// or a problem with the way mocha resolves the zarrita package. Either way after trying out
// various solutions like changing Node versions, ts config settings, and package.json settings
// I am timeboxing this issue and moving on to the next task. - Sean M 08/30/2024
// The same issue occurs with omezarr. Applying the same workaround - Will Moore October 2025

import { ThumbnailConfig } from "../../state/selection/actions";

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

type OmeroChannel = {
    color: string;
    active?: boolean;
};

/**
 * Main function to attempt to render a usable thumbnail using the lowest
 * resolution present in a zarr image's metadata.
 */
export async function renderZarrThumbnailURL(
    zarrUrl: string,
    targetSize: number,
    thumbnailConfig?: ThumbnailConfig
): Promise<string | undefined> {
    // thumbnailConfig = thumbnailConfig ?? {
    //   relativeZ: 0.5,
    //   relativeT: 0.5,
    //   overrideOmeroMetadata: true,
    //   channelConfigs: [
    //     {hexColor: "FF0000", enabled: true},
    //     {hexColor: "00FF00", enabled: true}
    //   ]
    // }
    try {
        return await retryWithTimeout(
            async () => {
                const image = await omezarr.NgffImage.load(zarrUrl, {
                    datasetIndex: -1,
                    attrs: undefined,
                });
                let slices: { z?: number; t?: number } | undefined = undefined;
                let channels: OmeroChannel[] | undefined = undefined;

                if (thumbnailConfig !== undefined) {
                    const shape: number[] = await image.getShape(); // 0-level
                    const axesNames = image.getAxesNames();
                    const cIndex = axesNames.indexOf("c");
                    const maxChannels = shape[cIndex];

                    const hasOmeroMetadata = image.omero !== undefined;
                    if (!hasOmeroMetadata || thumbnailConfig.overrideOmeroMetadata) {
                        const channelConfigs = thumbnailConfig.channelConfigs ?? [];
                        channels = channelConfigs
                            .map((config) => ({
                                color: config.hexColor,
                                active: config.enabled,
                            }))
                            .filter((_, index) => index < maxChannels);
                    }
                    console.log("channels", channels);

                    const zIndex: number = axesNames.indexOf("z");
                    const tIndex: number = axesNames.indexOf("t");

                    if (zIndex !== -1 || tIndex !== -1) {
                        slices = {};
                        if (zIndex !== -1 && thumbnailConfig) {
                            const zDim = shape[zIndex];
                            slices.z = Math.floor(zDim * thumbnailConfig.relativeZ);
                        }
                        if (tIndex !== -1 && thumbnailConfig) {
                            const tDim = shape[tIndex];
                            slices.t = Math.floor(tDim * thumbnailConfig.relativeT);
                        }
                    }
                }
                return image.render({ targetSize, autoBoost: true, slices, channels });
            },
            3,
            5000
        );
    } catch (error) {
        console.error("Failed to render Zarr thumbnail after 3 attempts:", error);
        return undefined; // Return undefined if all attempts fail
    }
}
