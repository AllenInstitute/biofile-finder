import ContextMenu from "./ContextMenu.png";
import WebViewer from "./WebViewer.png";
import { Feature } from "../Feature";

export default {
    id: 3,
    text: "Directly open images in a web-based viewer",
    slides: [
        {
            imgSrc: ContextMenu,
            caption:
                'Right-click your file selection to open a context menu of external applications that can open the files. This example highlights the "3D Web Viewer," a free open source visualization tool also developed by AICS.',
        },
        {
            imgSrc: WebViewer,
            caption:
                "This is that same file we were looking at in the context menu, now opened in the 3D Web Viewer instantly from BioFile Finder.",
        },
    ],
} as Feature;
