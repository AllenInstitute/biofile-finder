// This conditional import is due to to this unresolved error:
// https://github.com/AllenInstitute/biofile-finder/issues/178
// where the zarrita package produces "Exception during run: Error: No "exports" main
// defined in /zarrita/package.json" during test runs.
// This seems to either be due to a problem with the zarrita package
// or a problem with the way mocha resolves the zarrita package. Either way after trying out
// various solutions like changing Node versions, ts config settings, and package.json settings
// I am timeboxing this issue and moving on to the next task. - Sean M 08/30/2024
let zarr: any;
const isInTest = typeof global.it === "function";
if (isInTest) {
    zarr = {};
} else {
    import("zarrita").then((zarrita) => {
        zarr = zarrita;
    });
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

/** 
Function to transform metadata array of dims to a map that is easily readable by
zarr.get function to access a slice of image.
*/
function transformAxes(originalArray: AxisData[]): TransformedAxes[] {
    return originalArray.map((item) => ({
        name: item.name,
        value: item.type !== "space" ? 0 : null,
    }));
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
export async function renderZarrThumbnailURL(zarrUrl: string): Promise<string | undefined> {
    try {
        return await retryWithTimeout(
            async () => {
                console.log("Starting Zarr thumbnail rendering for:", zarrUrl);

                // read base image into store
                const store = new zarr.FetchStore(zarrUrl);
                const root = zarr.root(store);
                const group = await zarr.open(root, { kind: "group" });

                // Check that image has readable metadata structure.
                // Because zarr images are just directories there is variation here.
                if (
                    !group.attrs ||
                    !Array.isArray(group.attrs.multiscales) ||
                    group.attrs.multiscales.length === 0
                ) {
                    throw new Error("Invalid multiscales attribute structure");
                }

                // Access the image metadata and find lowest resolution.
                const { multiscales } = group.attrs;
                const datasets = multiscales[0].datasets;
                const lowestResolutionDataset = datasets[datasets.length - 1];
                const lowestResolutionLocation = root.resolve(lowestResolutionDataset.path);
                const lowestResolution = await zarr.open(lowestResolutionLocation, {
                    kind: "array",
                });

                // Determine a slice of the image that has the best chance at being a good thumbnail.
                // X and Y will have full range, while Z will be the middle integer.
                // Non-spatial dims will default to None.
                const axes = transformAxes(multiscales[0].axes);
                const zIndex = axes.findIndex((item) => item.name === "z");
                if (zIndex !== -1) {
                    const zSliceIndex = Math.ceil(lowestResolution.shape[zIndex] / 2);
                    axes[zIndex].value = zSliceIndex;
                }

                // Create a view (get data) of the determined lowest resolution using the
                // choices made for each axes.
                const lowestResolutionView = await zarr.get(
                    lowestResolution,
                    axes.map((item) => item.value)
                );
                const u16data = lowestResolutionView.data as Uint16Array;

                // Normalize Data to improve image visibility.
                const min = Math.min(...u16data);
                const max = Math.max(...u16data);
                const normalizedData = new Uint8Array(u16data.length);
                for (let i = 0; i < u16data.length; i++) {
                    normalizedData[i] = Math.round((255 * (u16data[i] - min)) / (max - min));
                }

                // Build a canvas to put image data onto.
                const width = lowestResolution.shape[axes.findIndex((item) => item.name === "x")];
                const height = lowestResolution.shape[axes.findIndex((item) => item.name === "y")];
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const context = canvas.getContext("2d");

                if (!context) {
                    throw new Error("Failed to get canvas context");
                }

                // Draw data to canvas in grayscale.
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
            },
            3,
            5000
        );
    } catch (error) {
        console.error("Failed to render Zarr thumbnail after 3 attempts:", error);
        return undefined; // Return undefined if all attempts fail
    }
}
