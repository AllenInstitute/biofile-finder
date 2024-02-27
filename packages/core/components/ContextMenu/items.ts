import { ContextualMenuItemType, IContextualMenuItem } from "@fluentui/react";
import { Dispatch } from "redux";

import { interaction } from "../../state";

export enum ContextMenuActions {
    COPY = "copy",
    COLLECTION = "collection",
    CUSTOM_COLLECTION = "custom-collection",
    DEFAULT_COLLECTION = "default-collection",
    DOWNLOAD = "download",
    MODIFY_COLUMNS = "modify-columns",
    CSV = "csv",
    COMPRESSED_DATA_SOURCE = "compressed-data-source",
    OPEN = "open",
    OPEN_WITH = "open-with",
    OPEN_WITH_OTHER = "open-with-other",
    PASTE = "paste",
    SAVE_AS = "save-as",
    OPEN_3D_VIEWER = "open-3d-viewer",
    OPEN_AS_URL = "open-as-url",
    OPEN_PLATE_UI = "open-plate-ui",
}

const MENU_HEADER_STYLES = {
    label: {
        // Color pulled from App.module.css "primary-brand-purple"
        color: "#827aa3",
    },
};

interface ContextMenuItems {
    ACCESS: IContextualMenuItem[],
    COPY: IContextualMenuItem,
    MODIFY_COLUMNS: IContextualMenuItem,
    PASTE: IContextualMenuItem,
}

/**
 * This is intended to be a catalogue of context menu items and that can be reused as various context menus are built up
 * throughout the app. Many of the `onClick` methods of the items/subitems will require access to the Redux store's `dispatch`,
 * so this "factory" of sorts is parameterized by `dispatch`, and thereby available to `onClick` handlers through closure.
 */
export default function getContextMenuItems(dispatch: Dispatch): ContextMenuItems {
    return {
        ACCESS: [
            // TODO: This would still be cool on desktop
            // {
            //     key: ContextMenuActions.OPEN,
            //     text: "Open",
            //     onClick() {
            //         dispatch(interaction.actions.openWithDefault());
            //     },
            // },
            {
                key: ContextMenuActions.OPEN_WITH,
                text: "Open with",
                // Dynamically generated application options will/should be
                // inserted here
            },
            {
                key: ContextMenuActions.SAVE_AS,
                text: "Save as",
                subMenuProps: {
                    items: [
                        {
                            key: ContextMenuActions.CSV,
                            text: "CSV",
                            title: "CSV manifest containing the selected files",
                            onClick() {
                                dispatch(interaction.actions.showManifestDownloadDialog());
                            },
                        },
                        {
                            key: ContextMenuActions.COMPRESSED_DATA_SOURCE,
                            text: "Compressed Data Source",
                            title: "New data source file containing the selected files",
                            onClick() {
                                dispatch(interaction.actions.showManifestDownloadDialog());
                            },
                        },
                    ]
                },
            },
            {
                key: ContextMenuActions.DOWNLOAD,
                text: "Download",
                title: "Download selected files",
                onClick() {
                    dispatch(interaction.actions.downloadFiles());
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
