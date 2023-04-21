import { ContextualMenuItemType } from "@fluentui/react";
import { Dispatch } from "redux";

import { interaction } from "../../state";

export enum ContextMenuActions {
    COPY = "copy",
    CSV_MANIFEST = "csv-manifest",
    CUSTOM_COLLECTION = "custom-collection",
    DEFAULT_COLLECTION = "default-collection",
    DOWNLOAD = "download",
    MODIFY_COLUMNS = "modify-columns",
    OPEN = "open",
    OPEN_WITH = "open-with",
    OPEN_WITH_OTHER = "open-with-other",
    PASTE = "paste",
    SHARE = "share",
}

const MENU_HEADER_STYLES = {
    label: {
        // Color pulled from App.module.css "primary-brand-purple"
        color: "#827aa3",
    },
};

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
                text: "Share Collection",
                subMenuProps: {
                    items: [
                        {
                            key: "default-configuration-header",
                            text: "Default Configuration",
                            itemType: ContextualMenuItemType.Header,
                            itemProps: {
                                styles: MENU_HEADER_STYLES,
                            },
                        },
                        {
                            key: ContextMenuActions.DEFAULT_COLLECTION,
                            text: "Not-frozen, expires tomorrow",
                            title: "Shareable FMS File Explorer URL to file selection",
                            onClick() {
                                dispatch(interaction.actions.generateShareableFileSelectionLink());
                            },
                        },
                        {
                            key: "custom-configuration-header",
                            text: "Custom Configuration",
                            itemType: ContextualMenuItemType.Header,
                            itemProps: {
                                styles: MENU_HEADER_STYLES,
                            },
                        },
                        {
                            key: ContextMenuActions.CUSTOM_COLLECTION,
                            text: "Configure...",
                            title: "Shareable custom collection",
                            onClick() {
                                dispatch(interaction.actions.showCreateCollectionDialog());
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
            {
                key: ContextMenuActions.DOWNLOAD,
                text: "Download",
                title: "Download selected files",
                onClick() {
                    dispatch(interaction.actions.downloadFiles());
                },
            },
            {
                key: ContextMenuActions.DOWNLOAD,
                text: "Download to...",
                title: "Download selected files to downloads folder",
                onClick() {
                    dispatch(interaction.actions.downloadFiles(undefined, true));
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
