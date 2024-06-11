import * as zarr from "@zarrita/core";
import { FetchStore } from "@zarrita/storage";
import { get as zarrGet } from "@zarrita/indexing";

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
            const { multiscales } = group.attrs;
            const datasets = multiscales[0].datasets;
            const lowestResolutionDataset = datasets[datasets.length - 1];
            const lowestResolutionLocation = root.resolve(lowestResolutionDataset.path);
            const lowestResolution = await zarr.open(lowestResolutionLocation, { kind: "array" }); // TODO: check the filesize before slicing
            const lowestResolutionView = await zarrGet(lowestResolution, [0, 0, 21, null, null]); // TODO: make this slicing dynamic

            const data = lowestResolutionView.data as Uint16Array;

            // Normalize the Uint16Array data to 8-bit
            const maxVal = Math.max(...data);
            const minVal = Math.min(...data);
            const normalizedData = new Uint8ClampedArray(data.length);
            for (let i = 0; i < data.length; i++) {
                normalizedData[i] = ((data[i] - minVal) / (maxVal - minVal)) * 255;
            }

            // Create a canvas to draw the image
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            const width = Math.min(100, lowestResolution.shape[3]); // Set to actual data width if less than 100
            const height = Math.min(100, lowestResolution.shape[4]); // Set to actual data height if less than 100
            canvas.width = width;
            canvas.height = height;

            if (context) {
                const imageData = context.createImageData(width, height);
                const imageDataArray = imageData.data;

                // Populate the ImageData object with the normalized data
                for (let i = 0; i < normalizedData.length; i++) {
                    const value = normalizedData[i];
                    imageDataArray[i * 4] = value; // Red
                    imageDataArray[i * 4 + 1] = value; // Green
                    imageDataArray[i * 4 + 2] = value; // Blue
                    imageDataArray[i * 4 + 3] = 255; // Alpha
                }
                context.putImageData(imageData, 0, 0);

                const dataURL = canvas.toDataURL("image/png");
                return dataURL;
            } else {
                throw new Error("Unable to get 2D context from canvas");
            }
        } else {
            throw new Error("Invalid multiscales attribute structure");
        }
    } catch (error) {
        console.error("Error reading Zarr image:", error);
        throw error;
    }
}
