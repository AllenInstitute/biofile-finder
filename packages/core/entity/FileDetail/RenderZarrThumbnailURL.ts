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

// TODO: This is being set to `typeof omezarr.Channel` to silence type errors
// but should actually be `omezarr.Channel` once `ome-zarr.js` is imported
// without the workaround.
export type OmeroChannel = Omit<typeof omezarr.Channel, "window">;

/** Dimensions of the Zarr array. */
export type ZarrDims = {
    x: number | undefined;
    y: number | undefined;
    z: number | undefined;
    c: number | undefined;
    t: number | undefined;
};

async function defaultNgffImageLoader(
    zarrUrl: string,
    options?: { signal?: AbortSignal }
): Promise<typeof omezarr.NgffImage> {
    return await omezarr.NgffImage.load(zarrUrl, options);
}

type RenderZarrThumbnailOptions = {
    thumbnailConfig?: ThumbnailConfig;
    /**
     * NGFF image loader. Uses `omezarr.NgffImage.load` by default if none is
     * provided.
     */
    ngffImageLoader?: typeof defaultNgffImageLoader;
    abortSignal?: AbortSignal;
    /**
     * Callback invoked when the image is loaded; returns the Zarr array
     * dimensions.
     */
    onLoad?: (shape: ZarrDims) => void;
};

/**
 * Main function to attempt to render a usable thumbnail using the lowest
 * resolution present in a zarr image's metadata.
 */
export async function renderZarrThumbnailURL(
    zarrUrl: string,
    targetSize: number,
    options: RenderZarrThumbnailOptions
): Promise<string | undefined> {
    try {
        return await retryWithTimeout(
            async () => {
                const { thumbnailConfig, abortSignal } = options;
                if (abortSignal?.aborted) {
                    return undefined;
                }

                const imageLoader = options.ngffImageLoader ?? defaultNgffImageLoader;
                const image = await imageLoader(zarrUrl, { signal: abortSignal });
                let slices: { z?: number; t?: number } | undefined = undefined;
                let channels: OmeroChannel[] | undefined = undefined;

                // Get and report Zarr dimensions
                const shape: number[] = await image.getShape(); // 0-level
                const axesNames = image.getAxesNames();
                const tIndex = axesNames.indexOf("t");
                const cIndex = axesNames.indexOf("c");
                const zIndex = axesNames.indexOf("z");
                const yIndex = axesNames.indexOf("y");
                const xIndex = axesNames.indexOf("x");
                const t = tIndex !== -1 ? shape[tIndex] : undefined;
                const c = cIndex !== -1 ? shape[cIndex] : undefined;
                const z = zIndex !== -1 ? shape[zIndex] : undefined;
                const y = yIndex !== -1 ? shape[yIndex] : undefined;
                const x = xIndex !== -1 ? shape[xIndex] : undefined;
                const zarrShape: ZarrDims = { x, y, z, c, t };
                options.onLoad?.(zarrShape);

                if (thumbnailConfig !== undefined) {
                    if (c !== undefined) {
                        const omeroChannels = image.imgAttrs?.omero?.channels;
                        const hasOmeroMetadata =
                            omeroChannels !== undefined && omeroChannels.length > 0;
                        if (!hasOmeroMetadata || thumbnailConfig.overrideOmeroMetadata) {
                            const channelConfigs = thumbnailConfig.channelConfigs;
                            channels = channelConfigs
                                .filter((_, index) => index < c)
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

                    if (z !== undefined || t !== undefined) {
                        slices = {};
                        if (z !== undefined) {
                            const zSlice = Math.floor((z - 1) * thumbnailConfig.relativeZ);
                            slices.z = Math.max(0, Math.min(zSlice, z - 1));
                        }
                        if (t !== undefined) {
                            const tSlice = Math.floor((t - 1) * thumbnailConfig.relativeT);
                            slices.t = Math.max(0, Math.min(tSlice, t - 1));
                        }
                    }
                }
                return image.render({
                    targetSize,
                    autoBoost: true,
                    slices,
                    // Note: missing window param
                    channels: channels as (typeof omezarr.Channel)[],
                    signal: abortSignal,
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
