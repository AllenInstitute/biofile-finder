export interface Feature {
    id: number;
    text: string; // Left menu
    caption: string; // Caption above image
    imgSrc?: string; // Image src
}

export const features = [
    {
        id: 1,
        text: "Find target files quickly",
        caption: `Filter, sort, group or search for your files
      in a predictable and standard way and view thumbnails for 
      quick identification. Switch to thumbnail view for...this 
      is placeholder text for now.`,
    },
    {
        id: 2,
        text: "Create new or combine subsets",
        caption: "Placeholder text about creating or combining",
    },
    {
        id: 3,
        text: "Directly open images in popular apps",
        caption: "Placeholder text about directly opening images",
    },
    {
        id: 4,
        text: "Share via URL, code snippet, or download",
        caption: "Placeholder text about sharing code snippets",
    },
    {
        id: 5,
        text: "View OME.Zarr files instantly using the web-based 3D Volume Viewer",
        caption: "Placeholder text about viewing OME.Zarr files",
    },
];
