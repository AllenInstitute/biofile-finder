import { ContextualMenuItemType, IContextualMenuItem } from "@fluentui/react";
import { Dispatch } from "redux";

import { interaction } from "../../state";

export enum ContextMenuActions {
    AGAVE = "agave",
    COPY = "copy",
    CSV = "csv",
    DOWNLOAD = "download",
    JSON = "json",
    MODIFY_COLUMNS = "modify-columns",
    OPEN = "open",
    OPEN_3D_WEB_VIEWER = "open-3d-web-viewer",
    OPEN_PLATE_UI = "open-plate-ui",
    OPEN_WITH = "open-with",
    OPEN_WITH_OTHER = "open-with-other",
    PARQUET = "parquet",
    PASTE = "paste",
    SAVE_AS = "save-as",
    SAVE_AS_TITLE = "save-as-title",
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
export default function getContextMenuItems(
    dispatch: Dispatch,
    isQueryingAicsFms = false
): ContextMenuItems {
    return {
        ACCESS: [
            {
                key: ContextMenuActions.OPEN_WITH,
                text: "Open with",
                iconProps: {
                    iconName: "OpenInNewWindow",
                },
                // Dynamically generated application options will/should be
                // inserted here
            },
            {
                key: ContextMenuActions.SAVE_AS,
                text: "Save metadata as",
                iconProps: {
                    iconName: "Saveas",
                },
                subMenuProps: {
                    items: [
                        {
                            key: ContextMenuActions.SAVE_AS_TITLE,
                            text: "DATA SOURCE TYPES",
                            title: "Types of data sources available for export",
                            itemType: ContextualMenuItemType.Header,
                        },
                        {
                            key: "data-source-types-divider",
                            itemType: ContextualMenuItemType.Divider,
                        },
                        {
                            key: ContextMenuActions.CSV,
                            text: "CSV",
                            iconProps: {
                                iconName: "Folder",
                            },
                            title: "Download a CSV of the metadata of the selected files",
                            onClick() {
                                dispatch(interaction.actions.showManifestDownloadDialog("csv"));
                            },
                        },
                        ...(isQueryingAicsFms
                            ? []
                            : [
                                  {
                                      key: ContextMenuActions.JSON,
                                      text: "JSON",
                                      iconProps: {
                                          iconName: "Folder",
                                      },
                                      title:
                                          "Download a JSON file of the metadata of the selected files",
                                      onClick() {
                                          dispatch(
                                              interaction.actions.showManifestDownloadDialog("json")
                                          );
                                      },
                                  },
                                  {
                                      key: ContextMenuActions.PARQUET,
                                      text: "Parquet",
                                      iconProps: {
                                          iconName: "Folder",
                                      },
                                      title:
                                          "Download a Parquet file of the metadata of the selected files",
                                      onClick() {
                                          dispatch(
                                              interaction.actions.showManifestDownloadDialog(
                                                  "parquet"
                                              )
                                          );
                                      },
                                  },
                              ]),
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
                    dispatch(interaction.actions.downloadFiles());
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
