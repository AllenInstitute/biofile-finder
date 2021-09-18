import { Dispatch } from "redux";

import { interaction } from "../../state";

export enum ContextMenuActions {
    COPY = "copy",
    CSV_MANIFEST = "csv-manifest",
    FIXED_DATASET = "fixed-dataset",
    LIVE_FILE_SET = "live-file-set",
    MODIFY_COLUMNS = "modify-columns",
    OPEN = "open",
    OPEN_WITH = "open-with",
    OPEN_WITH_OTHER = "open-with-other",
    PASTE = "paste",
    SHARE = "share",
    TEMPORARY_LINK = "temporary-link",
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
                key: ContextMenuActions.OPEN,
                text: "Open",
                onClick() {
                    dispatch(interaction.actions.openWithDefault());
                },
            },
            {
                key: ContextMenuActions.OPEN_WITH,
                text: "Open with",
                // Dynamically generated application options will/should be
                // inserted here
            },
            {
                key: ContextMenuActions.SHARE,
                text: "Share",
                subMenuProps: {
                    items: [
                        {
                            key: ContextMenuActions.TEMPORARY_LINK,
                            text: "Copy temporary link to files",
                            title: "Shareable FMS File Explorer URL to file selection",
                            onClick() {
                                dispatch(interaction.actions.generateShareableFileSelectionLink());
                            },
                        },
                        {
                            key: ContextMenuActions.LIVE_FILE_SET,
                            text: "Generate live file set",
                            title: "Generate a live file set to share",
                            onClick() {
                                dispatch(interaction.actions.showGenerateLiveFileSetDialog());
                            },
                        },
                        {
                            key: ContextMenuActions.FIXED_DATASET,
                            text: "Generate fixed immutable dataset",
                            title:
                                "Generate a fixed dataset with immutable metadata from this point in time",
                            onClick() {
                                dispatch(interaction.actions.showGenerateFixedDatasetDialog());
                            },
                        },
                    ],
                },
            },
            {
                key: ContextMenuActions.CSV_MANIFEST,
                text: "Generate CSV manifest",
                title: "CSV file of metadata of selected files",
                onClick() {
                    dispatch(interaction.actions.showManifestDownloadDialog());
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
