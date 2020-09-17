import { Dispatch } from "redux";

import { ContextualMenuItemType } from "./";
import { interaction } from "../../state";

/**
 * This is intended to be a catalogue of context menu items and that can be reused as various context menus are built up
 * throughout the app. Many of the `onClick` methods of the items/subitems will require access to the Redux store's `dispatch`,
 * so this "factory" of sorts is parameterized by `dispatch`, and thereby available to `onClick` handlers through closure.
 */
export default function getContextMenuItems(dispatch: Dispatch) {
    return {
        DOWNLOAD: {
            key: "download",
            text: "Download",
            subMenuProps: {
                items: [
                    {
                        key: "non-programmatic",
                        text: "Non-programmatic",
                        itemType: ContextualMenuItemType.Header,
                    },
                    {
                        key: "manifest",
                        text: "Manifest",
                        title: "CSV file of metadata of selected files",
                        onClick() {
                            dispatch(interaction.actions.toggleManifestDownloadDialog());
                        },
                    },
                    {
                        key: "shortcuts",
                        text: "Shortcuts",
                        title: "Coming soon! Create shortcuts on your computer to selected files",
                        disabled: true,
                    },
                    {
                        key: "tar-archive",
                        text: "Tar archive",
                        title: "Coming soon! Download an archive (bundle) of the selected files",
                        disabled: true,
                    },
                    {
                        key: "programmatic",
                        text: "Programmatic",
                        itemType: ContextualMenuItemType.Header,
                    },
                    {
                        key: "python-snippet",
                        text: "Python snippet",
                        title:
                            "Coming soon! Get a snippet in Python to work with your file selection programmatically",
                        disabled: true,
                    },
                ],
            },
        },
        MODIFY_COLUMNS: {
            key: "modify-column",
            text: "Modify Columns",
            title: "Modify Annotation Columns for File List",
        },
        OPEN_IN: {
            key: "open",
            text: "Open",
            subMenuProps: {
                items: [
                    {
                        key: "image-j",
                        text: "Image J",
                        title: "Open files in Image J",
                        onClick() {
                            dispatch(interaction.actions.openFilesInImageJ());
                        },
                    },
                    {
                        key: "fiji",
                        text: "Fiji",
                        title: "Coming soon! Open files in Fiji",
                        disabled: true,
                    },
                    {
                        key: "photoshop",
                        text: "Photoshop",
                        title: "Coming soon! Open files in Adobe Photoshop",
                        disabled: true,
                    },
                ],
            },
        },
    };
}
