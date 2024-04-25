import { Dispatch } from "redux";

import { interaction } from "../../state";
import { IContextualMenuItem } from "@fluentui/react";

export enum ContextMenuActions {
    COPY = "copy",
    CSV = "csv",
    DOWNLOAD = "download",
    MODIFY_COLUMNS = "modify-columns",
    OPEN = "open",
    OPEN_WITH = "open-with",
    OPEN_WITH_OTHER = "open-with-other",
    PARQUET = "parquet",
    PASTE = "paste",
    SAVE_AS = "save-as",
    OPEN_3D_WEB_VIEWER = "open-3d-web-viewer",
    OPEN_AS_URL = "open-as-url",
    OPEN_PLATE_UI = "open-plate-ui",
}

interface ContextMenuItems {
    ACCESS: IContextualMenuItem[];
    COPY: IContextualMenuItem;
    MODIFY_COLUMNS: IContextualMenuItem;
}

interface ContextMenuItems {
    ACCESS: IContextualMenuItem[];
    COPY: IContextualMenuItem;
    MODIFY_COLUMNS: IContextualMenuItem;
}

/**
 * This is intended to be a catalogue of context menu items and that can be reused as various context menus are built up
 * throughout the app. Many of the `onClick` methods of the items/subitems will require access to the Redux store's `dispatch`,
 * so this "factory" of sorts is parameterized by `dispatch`, and thereby available to `onClick` handlers through closure.
 */
export default function getContextMenuItems(dispatch: Dispatch): ContextMenuItems {
    return {
        ACCESS: [
            // TODO: Unavailable on web (can't guess)
            {
                key: ContextMenuActions.OPEN,
                text: "Open",
                iconProps: {
                    iconName: "OpenInNewWindow",
                },
                onClick() {
                    dispatch(interaction.actions.openWithDefault());
                },
            },
            {
                key: ContextMenuActions.OPEN_WITH,
                text: "Open With",
                iconProps: {
                    iconName: "OpenInNewWindow",
                },
                // Dynamically generated application options will/should be
                // inserted here
            },
            {
                key: ContextMenuActions.SAVE_AS,
                text: "Save Metadata As",
                iconProps: {
                    iconName: "Saveas",
                },
                subMenuProps: {
                    items: [
                        {
                            key: ContextMenuActions.CSV,
                            text: "CSV",
                            secondaryText: "Data Source",
                            iconProps: {
                                iconName: "Folder",
                            },
                            title: "Download a CSV of the metadata of the selected files",
                            onClick() {
                                dispatch(interaction.actions.showManifestDownloadDialog("csv"));
                            },
                        },
                        // TODO: Enable downloading as parquet file
                        // {
                        //     key: ContextMenuActions.PARQUET,
                        //     text: "Parquet",
                        // secondaryText: "Data Source",
                        // iconProps: {
                        //     iconName: "Folder",
                        // },
                        //     title: "Download a Parquet file of the metadata of the selected files",
                        //     onClick() {
                        //         dispatch(interaction.actions.showManifestDownloadDialog("parquet"));
                        //     },
                        // }
                    ],
                },
            },
            {
                key: ContextMenuActions.DOWNLOAD,
                text: "Download",
                title: "Download selected files to a specific directory",
                iconProps: {
                    iconName: "Download",
                },
                onClick() {
                    dispatch(interaction.actions.downloadFiles(undefined, true));
                },
            },
        ],
        COPY: {
            key: ContextMenuActions.COPY,
            text: "Copy",
            title: "Copy to clipboard",
            iconProps: {
                iconName: "Copy",
            },
        },
        MODIFY_COLUMNS: {
            key: ContextMenuActions.MODIFY_COLUMNS,
            text: "Modify columns",
            title: "Modify columns displayed in the file list",
            iconProps: {
                iconName: "TripleColumnEdit",
            },
        },
    };
}
