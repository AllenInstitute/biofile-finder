import { ContextualMenuItemType } from "@fluentui/react";
import { Dispatch } from "redux";

import { interaction } from "../../state";

export enum ContextMenuActions {
    COPY = "copy",
    CSV_MANIFEST = "csv-manifest",
    CUSTOM_FILE_SET = "custom-file-set",
    DEFAULT_FILE_SET = "default-file-set",
    MODIFY_COLUMNS = "modify-columns",
    OPEN = "open",
    OPEN_WITH = "open-with",
    OPEN_WITH_OTHER = "open-with-other",
    PASTE = "paste",
    SHARE = "share",
}

export const MENU_HEADER_STYLES = {
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
                            key: "default-configuration",
                            text: "Default Configuration",
                            itemType: ContextualMenuItemType.Header,
                            itemProps: {
                                styles: MENU_HEADER_STYLES
                            },
                        },
                        {
                            key: ContextMenuActions.DEFAULT_FILE_SET,
                            text: "Not-fixed, expires tomorrow",
                            title: "Shareable FMS File Explorer URL to file selection",
                            onClick() {
                                dispatch(interaction.actions.generateShareableFileSelectionLink({private: true}));
                            },
                        },
                        {
                            key: "custom-configuration",
                            text: "Custom Configuration",
                            itemType: ContextualMenuItemType.Header,
                            itemProps: {
                                styles: MENU_HEADER_STYLES
                            },
                        },
                        {
                            key: ContextMenuActions.CUSTOM_FILE_SET,
                            text: "Configure...",
                            title: "Shareable custom collection",
                            onClick() {
                                dispatch(interaction.actions.showGenerateFileSetDialog());
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
