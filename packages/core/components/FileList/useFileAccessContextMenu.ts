import { ContextualMenuItemType, IContextualMenuItem } from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import FileFilter from "../../entity/FileFilter";
import { interaction, selection } from "../../state";
import { ContextMenuItem } from "../ContextMenu";
import getContextMenuItems, { ContextMenuActions } from "../ContextMenu/items";
import { FmsFile } from "../../services/FileService";
import { AnnotationName } from "../../constants";

/**
 * Custom React hook for creating the file access context menu.
 *
 * File access context menu items are dynamically generated from a list of
 * previously saved applications. Can be supplied an array of filters to use
 * to find files to access instead of the currently selected files.
 */
export default function useFileAccessContextMenu(filters?: FileFilter[], onDismiss?: () => void) {
    const dispatch = useDispatch();
    const fileSelection = useSelector(selection.selectors.getFileSelection);
    const fileExplorerServiceBaseUrl = useSelector(
        interaction.selectors.getFileExplorerServiceBaseUrl
    );
    const userSelectedApplications = useSelector(interaction.selectors.getUserSelectedApplications);
    const { executionEnvService } = useSelector(interaction.selectors.getPlatformDependentServices);
    const [plateLink, setPlateLink] = React.useState<string>();
    const [filePath, setFilePath] = React.useState<string>();

    fileSelection.fetchFocusedItemDetails().then((fileDetails: FmsFile | undefined) => {
        if (!fileDetails) return;
        setFilePath(fileDetails.file_path);

        // Grabbing plate barcode
        const platebarcode = fileDetails.annotations.find(
            (x) => x.name === AnnotationName.PLATE_BARCODE
        );
        // If there's a barcode, make plateUI option available
        if (platebarcode?.values) {
            const barcode: string = platebarcode.values[0].toString();
            // LabKey does not support HTTPS yet
            const baseURLHttp = fileExplorerServiceBaseUrl.replace("https", "http");
            setPlateLink(
                `${baseURLHttp}/labkey/aics_microscopy/AICS/editPlate.view?Barcode=${barcode}}`
            );
        }
    });

    return React.useCallback(
        (evt: React.MouseEvent) => {
            const savedApps = userSelectedApplications || [];
            const openWithOptions = [
                ...savedApps
                    .map((app) => ({ ...app, name: executionEnvService.getFilename(app.filePath) }))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((app) => ({
                        key: `open-with-${app.name}`,
                        text: app.name,
                        title: `Open files with ${app.name}`,
                        onClick() {
                            dispatch(interaction.actions.openWith(app, filters));
                        },
                    })),
                ...(savedApps.length > 0
                    ? [
                          {
                              key: "default-apps-border",
                              itemType: ContextualMenuItemType.Divider,
                          },
                      ]
                    : []),
                // Other is a permanent option that allows the user
                // to add another app for file access
                {
                    key: ContextMenuActions.OPEN_WITH_OTHER,
                    text: "Other...",
                    title: "Select an application to open the selection with",
                    onClick() {
                        dispatch(interaction.actions.promptForNewExecutable(filters));
                    },
                },
                {
                    key: ContextMenuActions.OPEN_AS_URL,
                    text: "Open as URL",
                    title: "Open this file in the app's browser",
                    href: filePath,
                    target: "_blank",
                    disabled: !filePath,
                },
                {
                    key: ContextMenuActions.OPEN_PLATE_UI,
                    text: "Open Plate UI",
                    title: "Open this plate in the Plate UI",
                    href: plateLink,
                    target: "_blank",
                    disabled: !plateLink,
                },

                {
                    key: ContextMenuActions.OPEN_3D_VIEWER,
                    text: "Open 3D Viewer",
                    title: "Open this file in the AICS 3D Viewer",
                    href: `https://dev-aics-dtp-001.int.allencell.org/website-3d-cell-viewer/imageviewer/?url=${filePath}/`,
                    target: "_blank",
                    disabled: !filePath,
                },
            ];

            const items = getContextMenuItems(dispatch).ACCESS.map((item: IContextualMenuItem) => {
                const disabled = !filters && fileSelection.count() === 0;
                if (item.key === ContextMenuActions.OPEN_WITH) {
                    item.subMenuProps = { items: openWithOptions };
                } else if (item.key === ContextMenuActions.OPEN) {
                    item.onClick = () => {
                        dispatch(interaction.actions.openWithDefault(filters));
                    };
                } else if (item.key === ContextMenuActions.CSV_MANIFEST) {
                    item.onClick = () => {
                        dispatch(interaction.actions.showManifestDownloadDialog(filters));
                    };
                } else if (item.key === ContextMenuActions.SHARE) {
                    item.subMenuProps = {
                        items: item.subMenuProps?.items.map((subItem) => {
                            if (subItem.key === ContextMenuActions.CUSTOM_COLLECTION) {
                                subItem.onClick = () => {
                                    dispatch(
                                        interaction.actions.showCreateCollectionDialog(filters)
                                    );
                                };
                            } else if (subItem.key === ContextMenuActions.DEFAULT_COLLECTION) {
                                subItem.onClick = () => {
                                    dispatch(
                                        interaction.actions.generateShareableFileSelectionLink({
                                            filters,
                                        })
                                    );
                                };
                            }

                            return {
                                ...subItem,
                                disabled,
                            };
                        }) as ContextMenuItem[],
                    };
                }

                return {
                    ...item,
                    disabled,
                };
            });

            dispatch(interaction.actions.showContextMenu(items, evt.nativeEvent, onDismiss));
        },
        [
            dispatch,
            fileSelection,
            executionEnvService,
            userSelectedApplications,
            filters,
            onDismiss,
            plateLink,
            filePath,
        ]
    );
}
