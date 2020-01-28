import { Dispatch } from "redux";

import { ContextualMenuItemType } from "./";
import { interaction } from "../../state";

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
                            dispatch(interaction.actions.downloadManifest());
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
    };
}
