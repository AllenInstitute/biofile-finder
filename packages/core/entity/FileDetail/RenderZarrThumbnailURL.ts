// Zarr thumbnail rendering removed in the simplified build.
export async function renderZarrThumbnailURL(
    _zarrUrl: string,
    _targetSize: number | undefined
): Promise<string | undefined> {
    return undefined;
}
