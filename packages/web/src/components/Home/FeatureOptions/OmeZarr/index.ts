import Thumbnail from "./Thumbnail.png";
import Zarr from "./Zarr.png";
import { Feature } from "../Feature";

export default {
    id: 5,
    text: "View OME.Zarr or pre-generated thumbnail previews of files instantly",
    slides: [
        {
            imgSrc: Zarr,
            caption:
                "OME.Zarr files are a format for storing multi-dimensional arrays in a chunked, compressed, and efficient manner. BioFile Finder can read these files and preview them as thumbnails automatically.",
        },
        {
            imgSrc: Thumbnail,
            caption:
                'For other file formats, BioFile Finder can render pre-generated thumbnails for quick previewing. To do so, in your CSV, Parquet, or JSON file, include a column that contains the file path to the thumbnail image named "Thumbnail"',
        },
    ],
} as Feature;
