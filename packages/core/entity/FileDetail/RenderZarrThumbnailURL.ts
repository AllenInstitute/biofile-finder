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

export interface ThumbnailChannelConfig {
    enabled: boolean;
    /** 6-digit hex color code for the channel, with the `#` omitted. */
    hexColor: string;
}

/** Configuration options for automatic Zarr thumbnail generation. */
export interface ThumbnailConfig {
    /** Relative time to use for thumbnail generation, in a [0, 1] range. */
    relativeT: number;
    /** Relative Z slice to use for thumbnail generation, in a [0, 1] range. */
    relativeZ: number;
    /** Whether to override Omero metadata for Zarr thumbnail generation. */
    overrideOmeroMetadata: boolean;
    /**
     * Configuration applied to each channel, in order. For each channel `i`,
     * the corresponding configuration is `channelConfigs[i]`.
     *
     * If `i >= channelConfigs.length`, that channel will not be shown.
     */
    channelConfigs: ThumbnailChannelConfig[];
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

export type OmeroChannel = Omit<omezarr.Channel, "window">;

async function defaultNgffImageLoader(
    zarrUrl: string,
    options?: { signal?: AbortSignal }
): Promise<omezarr.NgffImage> {
    return await omezarr.NgffImage.load(zarrUrl, options);
}

/**
 * Main function to attempt to render a usable thumbnail using the lowest
 * resolution present in a zarr image's metadata.
 */
export async function renderZarrThumbnailURL(
    zarrUrl: string,
    targetSize: number,
    thumbnailConfig?: ThumbnailConfig,
    ngffImageLoader = defaultNgffImageLoader
): Promise<string | undefined> {
    try {
        return await retryWithTimeout(
            async () => {
                const image = await ngffImageLoader(zarrUrl);
                let slices: { z?: number; t?: number } | undefined = undefined;
                let channels: OmeroChannel[] | undefined = undefined;

                if (thumbnailConfig !== undefined) {
                    const shape: number[] = await image.getShape(); // 0-level
                    const axesNames = image.getAxesNames();
                    const cIndex = axesNames.indexOf("c");

                    if (cIndex !== -1) {
                        const maxChannels = shape[cIndex];
                        const omeroChannels = image.imgAttrs?.omero?.channels;
                        const hasOmeroMetadata =
                            omeroChannels !== undefined && omeroChannels.length > 0;
                        if (!hasOmeroMetadata || thumbnailConfig.overrideOmeroMetadata) {
                            const channelConfigs = thumbnailConfig.channelConfigs;
                            channels = channelConfigs
                                .filter((_, index) => index < maxChannels)
                                .map((config) => ({
                                    color: config.hexColor,
                                    active: config.enabled,
                                }));
                            if (
                                channels.length === 0 ||
                                channels.every((channel) => !channel.active)
                            ) {
                                // All channels are disabled; return undefined.
                                return undefined;
                            }
                        }
                    }

                    const zIndex: number = axesNames.indexOf("z");
                    const tIndex: number = axesNames.indexOf("t");

                    if (zIndex !== -1 || tIndex !== -1) {
                        slices = {};
                        if (zIndex !== -1) {
                            const zDim = shape[zIndex];
                            const zSlice = Math.floor((zDim - 1) * thumbnailConfig.relativeZ);
                            slices.z = Math.max(0, Math.min(zSlice, zDim - 1));
                        }
                        if (tIndex !== -1) {
                            const tDim = shape[tIndex];
                            const tSlice = Math.floor((tDim - 1) * thumbnailConfig.relativeT);
                            slices.t = Math.max(0, Math.min(tSlice, tDim - 1));
                        }
                    }
                }
                return image.render({
                    targetSize,
                    autoBoost: true,
                    slices,
                    // Note: missing window param
                    channels: channels as omezarr.Channel[],
                });
            },
            3,
            5000
        );
    } catch (error) {
        console.error("Failed to render Zarr thumbnail after 3 attempts:", error);
        return undefined; // Return undefined if all attempts fail
    }
}
