import CodeSnippet from "./CodeSnippet.png";
import Download from "./Download.png";
import URL from "./URL.png";
import { Feature } from "../Feature";

export default {
    id: 4,
    text: "Share via URL, code snippet, or download",
    slides: [
        {
            imgSrc: URL,
            caption:
                "Your exact file selection (filters, groups, sorts, open folders) can be shared via URL. Anyone with the URL can see the same view as you, as long as the data source is accessible to them. Local files, for example, must be re-selected by the user.",
        },
        {
            imgSrc: CodeSnippet,
            caption:
                "A code snippet can be generated that recreates your exact view (filters, groups, sorts) programmatically. This allows you to export or share your view to a Jupyter notebook.",
        },
        {
            imgSrc: Download,
            caption:
                "You can also download files directly from BioFile Finder. Select the file(s) you want to download, right-click to open the context menu, and select 'Download.'",
        },
    ],
} as Feature;
