import { renderThumbnail } from "./ome-zarr";

/**
 * Main function to attempt to render a usable thumbnail using the lowest
 * resolution present in a zarr image's metadata.
 */
export async function renderZarrThumbnailURL(zarrUrl: string): Promise<string | undefined> {
    try {
        return await renderThumbnail(zarrUrl, 150, false, 1000);
    } catch (error) {
        console.error("Failed to render Zarr thumbnail after 3 attempts:", error);
        return undefined; // Return undefined if all attempts fail
    }
}
