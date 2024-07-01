interface Slide {
    caption: string; // Caption above image
    imgSrc: string; // Image src
}

interface Feature {
    id: number;
    text: string; // Left menu
    slides: Slide[]; // Right carousel
}

const FEATURE_ASSET_FOLDER = "../../assets/features";

export default [
    {
        id: 1,
        text: "Find target files quickly",
        slides: [
            {
                imgSrc: `${FEATURE_ASSET_FOLDER}/FindingData/Group.png`,
                caption: `Unlike traditional file systems BioFile Finder allows you to dynamically generate your folder structure based on the metadata of your files. In this screenshot, the files are organized by (Grouped by) the "Gene" and "Structure" columns found in the selected Data source.`,
            },
            {
                imgSrc: `${FEATURE_ASSET_FOLDER}/FindingData/FilterColumn.png`,
                caption: `Filter by selecting a column to filter by...`,
            },
            {
                imgSrc: `${FEATURE_ASSET_FOLDER}/FindingData/FilterValue.png`,
                caption: `...then selecting a value for that column to filter by.`,
            },
            {
                imgSrc: `${FEATURE_ASSET_FOLDER}/FindingData/Sort.png`,
                caption: `Sort by clicking on the column header or the "Sort" button.`,
            },
        ],
    },
    {
        id: 2,
        text: "Create new data sources or combine them",
        slides: [
            {
                imgSrc: `${FEATURE_ASSET_FOLDER}/Datasets/LoadSource.png`,
                caption:
                    "Data can be loaded from a CSV, Parquet, or JSON file. The data source must include a column that contains the file path to the data. The data source can be loaded from a URL or uploaded from your local machine.",
            },
            {
                imgSrc: `${FEATURE_ASSET_FOLDER}/Datasets/AddDataSource.png`,
                caption:
                    "Adding a second, third, fourth, etc. data source works by simply repeating the process.",
            },
            {
                imgSrc: `${FEATURE_ASSET_FOLDER}/Datasets/GroupedDataSource.png`,
                caption:
                    'After you have added your data you can filter, group, and sort it however; this screenshot shows grouping by an automatically generated column "Data source" which represents the Data source each file came from.',
            },
            {
                imgSrc: `${FEATURE_ASSET_FOLDER}/Datasets/SaveMetadataAs.png`,
                caption:
                    'New data sources can be generated from any number of existing data sources (filtered or whole). Right-click to open a context menu over your file selection then select "Save metadata as" then your preferred file format.',
            },
            {
                imgSrc: `${FEATURE_ASSET_FOLDER}/Datasets/NewDataSourceColumns.png`,
                caption:
                    "The application will ask you which columns you would like included in the resulting new data source.",
            },
        ],
    },
    {
        id: 3,
        text: "Directly open images in a web-based viewer",
        slides: [
            {
                imgSrc: `${FEATURE_ASSET_FOLDER}/Viewers/ContextMenu.png`,
                caption:
                    "Files can be interacted with via this application, right-clicking your file selection will present a context menu where you can select the application to open the files in. This example highlights the '3D Web Viewier' a free open source 3D web viewer also developed by AICS.",
            },
            {
                imgSrc: `${FEATURE_ASSET_FOLDER}/Viewers/WebViewer.png`,
                caption:
                    "This is that same file we were looking at in the context menu, now opened in the 3D Web Viewer instantly from BioFile Finder.",
            },
        ],
    },
    {
        id: 4,
        text: "Share via URL, code snippet, or download",
        slides: [
            {
                imgSrc: `${FEATURE_ASSET_FOLDER}/Share/URL.png`,
                caption:
                    "Your exact view (filters, groups, sorts, open folders) can be shared via URL. This URL can be shared with anyone and they will see the exact same view you are seeing assuming the data source is accessible to them. Local files for example will have to be re-selected by the user.",
            },
            {
                imgSrc: `${FEATURE_ASSET_FOLDER}/Share/CodeSnippet.png`,
                caption:
                    "A code snippet can be generated that will recreate your exact view (filters, groups, sorts) programmatically. This could be useful for sharing your view with a colleague who is working in a Jupyter notebook for example.",
            },
            {
                imgSrc: `${FEATURE_ASSET_FOLDER}/Share/Download.png`,
                caption:
                    "Lastly, BioFile Finder can be used as an interface for downloading files. Select the file you want to download, right-click to open the context menu, and select 'Download' to download the focused file.",
            },
        ],
    },
    {
        id: 5,
        text: "View OME.Zarr or pre-generated thumbnails previews of files instantly",
        slides: [
            {
                imgSrc: `${FEATURE_ASSET_FOLDER}/OmeZarr/Zarr.png`,
                caption:
                    "OME.Zarr files are a format for storing multi-dimensional arrays in a chunked, compressed, and efficient manner. BioFile Finder can read these files and preview them as thumbnails automatically.",
            },
            {
                imgSrc: `${FEATURE_ASSET_FOLDER}/OmeZarr/Thumbnail.png`,
                caption:
                    'For other file formats, BioFile Finder can render pre-generated thumbnails for quick previewing. To do so, in your CSV, Parquet, or JSON file, include a column that contains the file path to the thumbnail image named "Thumbnail"',
            },
        ],
    },
] as Feature[];
