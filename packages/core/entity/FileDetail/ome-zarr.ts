// This conditional import is due to to this unresolved error:
// https://github.com/AllenInstitute/biofile-finder/issues/178
// where the zarrita package produces "Exception during run: Error: No "exports" main
// defined in /zarrita/package.json" during test runs.
// This seems to either be due to a problem with the zarrita package
// or a problem with the way mocha resolves the zarrita package. Either way after trying out
// various solutions like changing Node versions, ts config settings, and package.json settings
// I am timeboxing this issue and moving on to the next task. - Sean M 08/30/2024
let zarr: any;
import("zarrita").then((zarrita) => {
    zarr = zarrita;
});

import {
    getDefaultVisibilities,
    hexToRGB,
    getArray,
    getDefaultColors,
    getMinMaxValues,
    getMultiscaleWithArray,
    getSlices,
    renderTo8bitArray,
    MAX_CHANNELS,
    Axis,
    Omero,
    Channel,
} from "./utils";

export async function renderThumbnail(
    store: any,
    targetSize: number | undefined = undefined,
    autoBoost: false,
    maxSize: 1000
): Promise<string> {
    if (typeof store === "string") {
        store = new zarr.FetchStore(store);
    }

    // Lets load SMALLEST resolution and render it as a thumbnail
    const datasetIndex = -1;
    const { multiscale, omero, zarr_version, arr, shapes } = await getMultiscaleWithArray(
        store,
        datasetIndex
    );

    // targetSize is specified, may need to load a different resolution...
    // pick a different dataset level if we want a different size
    if (!arr) {
        return ":(";
    }
    const shape = arr.shape;
    const dims = shape.length;
    const width = shape[dims - 1];
    const height = shape[dims - 2];
    if (height * width > maxSize * maxSize) {
        throw new Error(
            `Lowest resolution (${width} * ${height}) is too large for Thumbnail. Limit is ${maxSize} * ${maxSize}`
        );
    }

    const longestSide = Math.max(width, height);
    if (targetSize !== undefined && targetSize > longestSide) {
        let longestSizes: number[] = [];
        // If we don't have shapes (v0.1, 0.2, 0.3), we "guess" scale of * 2 for each level
        if (shapes == undefined) {
            longestSizes = multiscale.datasets.map((d, i) => d && longestSide * 2 ** i);
            longestSizes.reverse();
            // e.g. [1568, 784, 392, 196, 98, 49]
        } else {
            longestSizes = shapes.map((shape) => Math.max(shape[dims - 1], shape[dims - 2]));
        }
        const paths: Array<string> = multiscale.datasets.map((d) => d.path);

        let pathIndex;
        for (pathIndex = 0; pathIndex < longestSizes.length; pathIndex++) {
            const size = longestSizes[pathIndex];
            const nextSize = longestSizes[pathIndex + 1];
            if (!nextSize) {
                // we have reached smallest
                break;
            } else if (nextSize > targetSize) {
                // go smaller
                continue;
            } else {
                // is targetSize closer to this or next?
                const avg = (size + nextSize) / 2;
                if (targetSize < avg) {
                    pathIndex += 1;
                }
                break;
            }
        }
        const path = paths[pathIndex];
        arr = await getArray(store, path, zarr_version);
    }

    // we want to remove any start/end values from window, to calculate min/max
    if (omero && "channels" in omero) {
        omero.channels = omero.channels.map((ch: Channel) => {
            if (ch.window) {
                ch.window.start = undefined;
                ch.window.end = undefined;
            }
            return ch;
        });
    }

    return renderImage(arr, multiscale.axes, omero, {}, autoBoost);
}

export async function renderImage(
    arr: any,
    axes: Axis[],
    omero: Omero | null | undefined,
    sliceIndices: { [k: string]: number | [number, number] | undefined } = {},
    autoBoost: false
) {
    // Main rendering function...
    // We have the zarr Array already in hand, axes for dimensions
    // and omero for rendering settings
    // if autoBoost is true, check histogram and boost contrast if needed
    const shape = arr.shape;

    // NB: v0.2 no axes. v0.3 is just list of 'x', 'y', 'z', 'c', 't'
    // v0.4 onwards is list of Axis objects
    const axesNames = axes?.map((a) => a.name || a.toString()) || ["t", "c", "z", "y", "x"];
    const chDim = axesNames.indexOf("c");
    const channel_count = shape[chDim] || 1;
    let visibilities;
    // list of [r,g,b] colors
    let rgbColors: Array<[number, number, number]>;
    let luts: Array<string | undefined> | undefined = undefined;
    let inverteds: Array<boolean> | undefined = undefined;

    // If we have 'omero', use it for channel rgbColors and visibilities
    if (omero) {
        let active_count = 0;
        visibilities = omero.channels.map((ch) => {
            if (ch.active == undefined) {
                ch.active = true;
            }
            active_count += ch.active ? 1 : 0;
            return ch.active && active_count <= MAX_CHANNELS;
        });
        rgbColors = omero.channels.map((ch) => hexToRGB(ch.color));
        luts = omero.channels.map((ch) => ("lut" in ch ? (ch.lut as string) : undefined));
    } else {
        visibilities = getDefaultVisibilities(channel_count);
        rgbColors = getDefaultColors(channel_count, visibilities);
    }
    // filter for active channels
    const activeChannelIndices = visibilities.reduce((prev, active, index) => {
        if (active) prev.push(index);
        return prev;
    }, []);
    rgbColors = activeChannelIndices.map((chIndex: number) => rgbColors[chIndex]);
    inverteds = activeChannelIndices.map((chIndex: number) =>
        Boolean(omero?.channels[chIndex].inverted)
    );
    if (luts !== undefined) {
        luts = luts.filter((_, index) => activeChannelIndices.includes(index));
    }

    // Get slices for each channel
    if (sliceIndices["z"] == undefined) {
        sliceIndices["z"] = omero?.rdefs?.defaultZ;
    }
    if (sliceIndices["t"] == undefined) {
        sliceIndices["t"] = omero?.rdefs?.defaultT;
    }
    const chSlices = getSlices(activeChannelIndices, shape, axesNames, sliceIndices);

    // Wait for all chunks to be fetched...
    const promises = chSlices.map((chSlice: any) => zarr.get(arr, chSlice));
    const ndChunks = await Promise.all(promises);

    // Use start/end values from 'omero' if available, otherwise calculate min/max
    const minMaxValues = activeChannelIndices.map((chIndex: number, i: number) => {
        if (omero && omero.channels[chIndex]) {
            const chOmero = omero.channels[chIndex];
            if (chOmero?.window?.start !== undefined && chOmero?.window?.end !== undefined) {
                return [chOmero.window.start, chOmero.window.end];
            }
        }
        return getMinMaxValues(ndChunks[i]);
    });

    // Render to 8bit rgb array
    const rbgData = renderTo8bitArray(
        ndChunks,
        minMaxValues,
        rgbColors,
        luts,
        inverteds,
        autoBoost
    );
    // Use a canvas element to convert the 8bit array to a dataUrl
    const canvas = document.createElement("canvas");
    const height = ndChunks[0].shape[0];
    const width = ndChunks[0].shape[1];
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
        return "";
    }
    context.putImageData(new ImageData(rbgData, width, height), 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    return dataUrl;
}
