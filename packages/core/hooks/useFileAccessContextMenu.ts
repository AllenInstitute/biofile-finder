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
export default (folderFilters?: FileFilter[], onDismiss?: () => void) => {
    const dispatch = useDispatch();
    const isOnWeb = useSelector(interaction.selectors.isOnWeb);
    const fileSelection = useSelector(selection.selectors.getFileSelection);
    const isQueryingAicsFms = useSelector(selection.selectors.isQueryingAicsFms);

    const [fileDetails, setFileDetails] = React.useState<FileDetail>();

    const openWithSubMenuItems = useOpenWithMenuItems(fileDetails, fileSelection, folderFilters);

    fileSelection.fetchFocusedItemDetails().then((fileDetails) => {
        setFileDetails(fileDetails);
    });

    return React.useCallback(
        (evt: React.MouseEvent) => {
            evt.preventDefault();

            const contextMenuItems: IContextualMenuItem[] = [
                ...(!folderFilters
                    ? []
                    : [
                          {
                              key: "expand",
                              text: "Expand all",
                              iconProps: {
                                  iconName: "ExploreContent",
                              },
                              onClick() {
                                  dispatch(selection.actions.expandAllFileFolders());
                              },
                          },
                          {
                              key: "collapse",
                              text: "Collapse all",
                              iconProps: {
                                  iconName: "CollapseContent",
                              },
                              onClick() {
                                  dispatch(selection.actions.collapseAllFileFolders());
                              },
                          },
                      ]),
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
                              disabled: !folderFilters && fileSelection.count() === 0,
                              onClick() {
                                  if (folderFilters) {
                                      dispatch(interaction.actions.openWithDefault(folderFilters));
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
                    disabled: !folderFilters && fileSelection.count() === 0,
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
                    disabled: !folderFilters && fileSelection.count() === 0,
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
                                disabled: !folderFilters && fileSelection.count() === 0,
                                title: "Download a CSV of the metadata of the selected files",
                                onClick() {
                                    dispatch(
                                        interaction.actions.showManifestDownloadDialog(
                                            "csv",
                                            folderFilters
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
                                          disabled: !folderFilters && fileSelection.count() === 0,
                                          title:
                                              "Download a JSON file of the metadata of the selected files",
                                          onClick() {
                                              dispatch(
                                                  interaction.actions.showManifestDownloadDialog(
                                                      "json",
                                                      folderFilters
                                                  )
                                              );
                                          },
                                      },
                                      {
                                          key: "parquet",
                                          text: "Parquet",
                                          disabled: !folderFilters && fileSelection.count() === 0,
                                          title:
                                              "Download a Parquet file of the metadata of the selected files",
                                          onClick() {
                                              dispatch(
                                                  interaction.actions.showManifestDownloadDialog(
                                                      "parquet",
                                                      folderFilters
                                                  )
                                              );
                                          },
                                      },
                                  ]),
                        ],
                    },
                },
                ...(isQueryingAicsFms && !isOnWeb
                    ? [
                          {
                              key: "copy-to-cache",
                              text: "Copy to vast",
                              title: "Copy selected files to NAS Cache (VAST)",
                              disabled: !folderFilters && fileSelection.count() === 0,
                              iconProps: { iconName: "MoveToFolder" },
                              onClick() {
                                  dispatch(interaction.actions.showCopyFileManifest());
                              },
                          },
                      ]
                    : []),
                {
                    key: "download",
                    text: "Download",
                    title: "Download selected files to a specific directory",
                    disabled: !folderFilters && fileSelection.count() === 0,
                    iconProps: {
                        iconName: "Download",
                    },
                    onClick() {
                        dispatch(interaction.actions.downloadFiles());
                    },
                },
            ];

            dispatch(
                interaction.actions.showContextMenu(contextMenuItems, evt.nativeEvent, onDismiss)
            );
        },
        [
            dispatch,
            fileDetails,
            fileSelection,
            folderFilters,
            isOnWeb,
            isQueryingAicsFms,
            onDismiss,
            openWithSubMenuItems,
        ]
    );
};
