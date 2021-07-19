import { Dispatch } from "redux";

import { ContextualMenuItemType } from "./";

export enum ContextMenuActions {
    COPY = "copy",
    CSV_MANIFEST = "csv-manifest",
    DOWNLOAD = "download-file",
    MODIFY_COLUMNS = "modify-columns",
    OPEN = "open",
    OPEN_WITH = "open-with",
    OPEN_WITH_OTHER = "open-with-other",
    PASTE = "paste",
    PYTHON_SNIPPET = "python-snippet",
}

/**
 * This is intended to be a catalogue of context menu items and that can be reused as various context menus are built up
 * throughout the app.
 */
export default function getContextMenuItems() {
    return {
        ACCESS: [
            {
                key: "non-programmatic-access",
                text: "Non-programmatic access",
                itemType: ContextualMenuItemType.Header,
            },
            {
                key: ContextMenuActions.OPEN,
                text: "Open",
                // onClick dynamically generated in useFileAccessContextMenu
            },
            {
                key: ContextMenuActions.OPEN_WITH,
                text: "Open with",
                // submenu dynamically generated in useFileAccessContextMenu
            },
            {
                key: ContextMenuActions.DOWNLOAD,
                text: "Download",
                title: "Download file(s)",
                // onClick dynamically generated in useFileAccessContextMenu
            },
            {
                key: ContextMenuActions.CSV_MANIFEST,
                text: "Generate CSV manifest",
                title: "CSV file of metadata of selected files",
                // onClick dynamically generated in useFileAccessContextMenu
            },
            {
                key: "programmatic-access",
                text: "Programmatic access",
                itemType: ContextualMenuItemType.Header,
            },
            {
                key: ContextMenuActions.PYTHON_SNIPPET,
                text: "Generate Python snippet",
                title: "Get a snippet in Python to work with your file selection programmatically",
                // onClick dynamically generated in useFileAccessContextMenu
            },
        ],
        COPY: {
            key: ContextMenuActions.COPY,
            text: "Copy",
        },
        MODIFY_COLUMNS: {
            key: ContextMenuActions.MODIFY_COLUMNS,
            text: "Modify columns",
            title: "Modify columns displayed in the file list",
        },
        PASTE: {
            key: ContextMenuActions.PASTE,
            text: "Paste",
        },
    };
}
