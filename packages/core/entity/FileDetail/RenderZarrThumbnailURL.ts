import * as zarr from "@zarrita/core";
import { FetchStore } from "@zarrita/storage";
import { get as zarrGet } from "@zarrita/indexing";

interface AxisData {
    name: string;
    type: "time" | "channel" | "space";
    unit?: string;
}

// Define the type for the transformed array items
interface TransformedAxes {
    name: string;
    value: number | null;
}

// Function to transform the array
function transformAxes(originalArray: AxisData[]): TransformedAxes[] {
    return originalArray.map((item) => ({
        name: item.name,
        value: item.type !== "space" ? 0 : null,
    }));
}

export async function renderZarrThumbnailURL(zarrUrl: string): Promise<string> {
    console.log("RENDERING THUMB");
    try {
        const store = new FetchStore(zarrUrl);
        const root = zarr.root(store);
        const group = await zarr.open(root, { kind: "group" });

        if (
            !group.attrs ||
            !Array.isArray(group.attrs.multiscales) ||
            group.attrs.multiscales.length === 0
        ) {
            throw new Error("Invalid multiscales attribute structure");
        }

        const { multiscales } = group.attrs;
        const datasets = multiscales[0].datasets;
        const lowestResolutionDataset = datasets[datasets.length - 1];
        const lowestResolutionLocation = root.resolve(lowestResolutionDataset.path);
        const lowestResolution = await zarr.open(lowestResolutionLocation, { kind: "array" });

        // Determine Slice
        const axes = transformAxes(multiscales[0].axes);
        const zIndex = axes.findIndex((item) => item.name === "z");
        if (zIndex !== -1) {
            const zSliceIndex = Math.ceil(lowestResolution.shape[zIndex] / 2);
            axes[zIndex].value = zSliceIndex;
        }

        const lowestResolutionView = await zarrGet(
            lowestResolution,
            axes.map((item) => item.value)
        );
        const u16data = lowestResolutionView.data as Uint16Array;

        // Normalize Data
        const min = Math.min(...u16data);
        const max = Math.max(...u16data);
        const normalizedData = new Uint8Array(u16data.length);
        for (let i = 0; i < u16data.length; i++) {
            normalizedData[i] = Math.round((255 * (u16data[i] - min)) / (max - min));
        }

        // Build Canvas
        const width = lowestResolution.shape[axes.findIndex((item) => item.name === "x")];
        const height = lowestResolution.shape[axes.findIndex((item) => item.name === "y")];
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");

        if (!context) {
            throw new Error("Failed to get canvas context");
        }

        // Draw data
        const imageData = context.createImageData(width, height);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const value = normalizedData[y * width + x];
                imageData.data[idx] = value; // Red
                imageData.data[idx + 1] = value; // Green
                imageData.data[idx + 2] = value; // Blue
                imageData.data[idx + 3] = 255; // Alpha
            }
        }

        context.putImageData(imageData, 0, 0);

        // Convert data to data URL
        return canvas.toDataURL("image/png");
    } catch (error) {
        console.error("Error reading Zarr image:", error);
        throw error;
    }
}
