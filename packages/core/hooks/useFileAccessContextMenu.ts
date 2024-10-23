import { ContextualMenuItemType, IContextualMenuItem } from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import useOpenWithMenuItems from "./useOpenWithMenuItems";
import FileDetail from "../entity/FileDetail";
import FileFilter from "../entity/FileFilter";
import { interaction, selection } from "../state";

/**
 * Custom React hook for creating the file access context menu.
 *
 * File access context menu items are dynamically generated from a list of
 * previously saved applications. Can be supplied an array of filters to use
 * to find files to access instead of the currently selected files.
 */
export default (filters?: FileFilter[], onDismiss?: () => void) => {
    const dispatch = useDispatch();
    const isOnWeb = useSelector(interaction.selectors.isOnWeb);
    const fileSelection = useSelector(selection.selectors.getFileSelection);
    const isQueryingAicsFms = useSelector(selection.selectors.isQueryingAicsFms);

    const [fileDetails, setFileDetails] = React.useState<FileDetail>();

    const openWithSubMenuItems = useOpenWithMenuItems(fileDetails, filters);

    fileSelection.fetchFocusedItemDetails().then((fileDetails) => {
        setFileDetails(fileDetails);
    });

    return React.useCallback(
        (evt: React.MouseEvent) => {
            evt.preventDefault();

            const contextMenuItems: IContextualMenuItem[] = [
                // Avoid showing default open option when on web
                ...(isOnWeb
                    ? []
                    : [
                          {
                              key: "open",
                              text: "Open",
                              iconProps: {
                                  iconName: "OpenInNewWindow",
                              },
                              disabled: !filters && fileSelection.count() === 0,
                              onClick() {
                                  if (filters) {
                                      dispatch(interaction.actions.openWithDefault(filters));
                                  } else if (fileDetails) {
                                      dispatch(
                                          interaction.actions.openWithDefault(undefined, [
                                              fileDetails,
                                          ])
                                      );
                                  }
                              },
                          },
                      ]),
                {
                    key: "open-with",
                    text: "Open with",
                    disabled: !filters && fileSelection.count() === 0,
                    iconProps: {
                        iconName: "OpenInNewWindow",
                    },
                    subMenuProps: {
                        items: openWithSubMenuItems,
                    },
                },
                {
                    key: "save-as",
                    text: "Save metadata as",
                    disabled: !filters && fileSelection.count() === 0,
                    iconProps: {
                        iconName: "Saveas",
                    },
                    subMenuProps: {
                        items: [
                            {
                                key: "save-as-title",
                                text: "DATA SOURCE TYPES",
                                title: "Types of data sources available for export",
                                itemType: ContextualMenuItemType.Header,
                            },
                            {
                                key: "csv",
                                text: "CSV",
                                disabled: !filters && fileSelection.count() === 0,
                                title: "Download a CSV of the metadata of the selected files",
                                onClick() {
                                    dispatch(
                                        interaction.actions.showManifestDownloadDialog(
                                            "csv",
                                            filters
                                        )
                                    );
                                },
                            },
                            // Can't download JSON or Parquet files when querying AICS FMS
                            ...(isQueryingAicsFms
                                ? []
                                : [
                                      {
                                          key: "json",
                                          text: "JSON",
                                          disabled: !filters && fileSelection.count() === 0,
                                          title:
                                              "Download a JSON file of the metadata of the selected files",
                                          onClick() {
                                              dispatch(
                                                  interaction.actions.showManifestDownloadDialog(
                                                      "json",
                                                      filters
                                                  )
                                              );
                                          },
                                      },
                                      {
                                          key: "parquet",
                                          text: "Parquet",
                                          disabled: !filters && fileSelection.count() === 0,
                                          title:
                                              "Download a Parquet file of the metadata of the selected files",
                                          onClick() {
                                              dispatch(
                                                  interaction.actions.showManifestDownloadDialog(
                                                      "parquet",
                                                      filters
                                                  )
                                              );
                                          },
                                      },
                                  ]),
                        ],
                    },
                },
                {
                    key: "download",
                    text: "Download",
                    title: "Download selected files to a specific directory",
                    disabled: !filters && fileSelection.count() === 0,
                    iconProps: {
                        iconName: "Download",
                    },
                    onClick() {
                        dispatch(interaction.actions.downloadFiles());
                    },
                },
                {
                    key: "move-files",
                    text: "Move Files",
                    title: "Move files between NAS Cache",
                    disabled: !filters && fileSelection.count() === 0,
                    iconProps: {
                        iconName: "MoveToFolder",
                    },
                    subMenuProps: {
                        items: [
                            {
                                key: "off-nas",
                                text: "Off NAS Cache",
                                title: "Move files off the NAS cache",
                                onClick() {
                                    // Placeholder for moving files off NAS Cache
                                    console.log("Move files off NAS Cache");
                                },
                            },
                            {
                                key: "onto-nas",
                                text: "Onto NAS Cache",
                                title: "Move files onto the NAS cache",
                                onClick() {
                                    // Placeholder for moving files onto NAS Cache
                                    console.log("Move files onto NAS Cache");
                                },
                            },
                        ],
                    },
                },
            ];

            dispatch(
                interaction.actions.showContextMenu(contextMenuItems, evt.nativeEvent, onDismiss)
            );
        },
        [
            filters,
            dispatch,
            onDismiss,
            isOnWeb,
            fileSelection,
            isQueryingAicsFms,
            fileDetails,
            openWithSubMenuItems,
        ]
    );
};
