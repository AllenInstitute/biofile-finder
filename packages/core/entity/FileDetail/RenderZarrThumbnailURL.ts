import * as zarr from "@zarrita/core";
import { FetchStore } from "@zarrita/storage";
import { get as zarrGet } from "@zarrita/indexing";

// Function to map grayscale value (0-255) to RGB color
function grayscaleToRGB(value: number): [number, number, number] {
    const r = value;
    const g = 0 + value;
    const b = 255 - value;
    return [r, g, b];
}

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
    return originalArray.map((item) => {
        let value: number | null;
        if (item.type !== "space") {
            // set non spatial to first occurence
            value = 0;
        } else {
            value = null;
        }

        return { name: item.name, value: value };
    });
}

export async function renderZarrThumbnailURL(zarrUrl: string): Promise<string> {
    try {
        const store = new FetchStore(zarrUrl);
        const root = zarr.root(store);
        const group = await zarr.open(root, { kind: "group" });

        if (
            group.attrs &&
            Array.isArray(group.attrs.multiscales) &&
            group.attrs.multiscales.length > 0
        ) {
            // Resolve file data
            const { multiscales } = group.attrs;
            const datasets = multiscales[0].datasets;
            const lowestResolutionDataset = datasets[datasets.length - 1];
            const lowestResolutionLocation = root.resolve(lowestResolutionDataset.path);
            const lowestResolution = await zarr.open(lowestResolutionLocation, { kind: "array" }); // TODO: check the filesize before slicing

            // Determine Slice
            const axes = transformAxes(multiscales[0].axes);
            if (axes.some((item) => item.name === "z")) {
                const zIndex = axes.findIndex((item) => item.name === "z");
                const zSliceIndex = Math.ceil(lowestResolution.shape[zIndex] / 2);
                axes[zIndex].value = zSliceIndex;
            }

            console.log(axes);
            const lowestResolutionView = await zarrGet(
                lowestResolution,
                axes.map((item) => item.value)
            );

            console.log("SHAPE", lowestResolutionView.shape);

            // Normalize Data
            const u16data = lowestResolutionView.data as Uint16Array;
            const min = Math.min(...u16data);
            const max = Math.max(...u16data);
            const normalizedData = new Uint8Array(u16data.length);
            for (let i = 0; i < u16data.length; i++) {
                normalizedData[i] = Math.round((255 * (u16data[i] - min)) / (max - min));
            }

            // Draw Data
            const width = lowestResolution.shape[axes.findIndex((item) => item.name === "x")];
            const height = lowestResolution.shape[axes.findIndex((item) => item.name === "y")];
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext("2d");

            if (!context) {
                throw new Error("Failed to get canvas context");
            }

            const imageData = context.createImageData(width, height);

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * 4;
                    const value = normalizedData[y * width + x];
                    const [r, g, b] = grayscaleToRGB(value);
                    imageData.data[idx] = r; // Red
                    imageData.data[idx + 1] = g; // Green
                    imageData.data[idx + 2] = b; // Blue
                    imageData.data[idx + 3] = 255; // Alpha
                }
            }

            context.putImageData(imageData, 0, 0);

            // Convert data to data URL
            const dataUrl = canvas.toDataURL("image/png");
            return dataUrl;
        } else {
            throw new Error("Invalid multiscales attribute structure");
        }
    } catch (error) {
        console.error("Error reading Zarr image:", error);
        throw error;
    }
}
