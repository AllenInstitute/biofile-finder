import { Dispatch } from "redux";

import { ContextualMenuItemType } from "./";
import { interaction } from "../../state";

export enum ContextMenuActions {
    COPY = "copy",
    CSV_MANIFEST = "csv-manifest",
    MODIFY_COLUMNS = "modify-columns",
    OPEN_WITH = "open-with",
    OPEN_WITH_IMAGEJ = "open-with-imagej",
    OPEN_WITH_OTHER = "open-with-other",
    PASTE = "paste",
    PYTHON_SNIPPET = "python-snippet",
}

/**
 * This is intended to be a catalogue of context menu items and that can be reused as various context menus are built up
 * throughout the app. Many of the `onClick` methods of the items/subitems will require access to the Redux store's `dispatch`,
 * so this "factory" of sorts is parameterized by `dispatch`, and thereby available to `onClick` handlers through closure.
 */
export default function getContextMenuItems(dispatch: Dispatch) {
    return {
        ACCESS: [
            {
                key: "non-programmatic-access",
                text: "Non-programmatic access",
                itemType: ContextualMenuItemType.Header,
            },
            {
                key: ContextMenuActions.OPEN_WITH,
                text: "Open with",
                title: "Open files with an application of your choosing",
                // Dynamically generated application options will/should be
                // inserted here
            },
            {
                key: ContextMenuActions.CSV_MANIFEST,
                text: "Generate CSV manifest",
                title: "CSV file of metadata of selected files",
                onClick() {
                    dispatch(interaction.actions.showManifestDownloadDialog());
                },
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
                onClick() {
                    dispatch(interaction.actions.showGeneratePythonSnippetDialog());
                },
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
