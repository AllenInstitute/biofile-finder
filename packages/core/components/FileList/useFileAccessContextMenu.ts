import { ContextualMenuItemType, IContextualMenuItem } from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { ContextMenuItem } from "../ContextMenu";
import getContextMenuItems, { ContextMenuActions } from "../ContextMenu/items";
import FileFilter from "../../entity/FileFilter";
import { interaction, selection } from "../../state";
import { AnnotationName } from "../../entity/Annotation";

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

    fileSelection.fetchFocusedItemDetails().then((fileDetails) => {
        if (!fileDetails) return;
        setFilePath(fileDetails.path);

        // Grabbing plate barcode
        const platebarcode = fileDetails.getFirstAnnotationValue(AnnotationName.PLATE_BARCODE);
        // If there's a barcode, make plateUI option available
        if (platebarcode) {
            // LabKey does not support HTTPS yet
            const baseURLHttp = fileExplorerServiceBaseUrl.replace("https", "http");
            setPlateLink(
                `${baseURLHttp}/labkey/aics_microscopy/AICS/editPlate.view?Barcode=${platebarcode}}`
            );
        }
    });

    return React.useCallback(
        (evt: React.MouseEvent) => {
            evt.preventDefault();
            const savedApps: IContextualMenuItem[] = (userSelectedApplications || []).map((app) => {
                const name = executionEnvService.getFilename(app.filePath);
                return {
                    key: `open-with-${name}`,
                    text: name,
                    title: `Open files with ${name}`,
                    onClick() {
                        dispatch(interaction.actions.openWith(app, filters));
                    },
                };
            });

            savedApps.push({
                key: ContextMenuActions.OPEN_3D_WEB_VIEWER,
                text: "3D Web Viewer",
                title: `Open files with 3D Web Viewer`,
                href: `https://allen-cell-animated.github.io/website-3d-cell-viewer/?url=${filePath}/`,
                disabled: !filePath,
                target: "_blank",
            });
            if (plateLink) {
                savedApps.push({
                    key: ContextMenuActions.OPEN_PLATE_UI,
                    text: "LabKey Plate UI",
                    title: "Open this plate in the Plate UI",
                    href: plateLink,
                    target: "_blank",
                });
            }

            const openWithOptions = [
                ...savedApps.sort((a, b) => (a.text || "").localeCompare(b.text || "")),
                {
                    key: "default-apps-border",
                    itemType: ContextualMenuItemType.Divider,
                },
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
            ];

            const items = getContextMenuItems(dispatch).ACCESS.map((item: IContextualMenuItem) => {
                const disabled = !filters && fileSelection.count() === 0;
                if (item.key === ContextMenuActions.OPEN_WITH) {
                    item.subMenuProps = { items: openWithOptions };
                } else if (item.key === ContextMenuActions.OPEN) {
                    item.onClick = () => {
                        dispatch(interaction.actions.openWithDefault(filters));
                    };
                } else if (item.key === ContextMenuActions.SAVE_AS) {
                    item.subMenuProps = {
                        items: item.subMenuProps?.items.map((subItem) => {
                            if (subItem.key === ContextMenuActions.CSV) {
                                subItem.onClick = () => {
                                    dispatch(
                                        interaction.actions.showManifestDownloadDialog(
                                            "csv",
                                            filters
                                        )
                                    );
                                };
                            } else if (subItem.key === ContextMenuActions.PARQUET) {
                                subItem.onClick = () => {
                                    dispatch(
                                        interaction.actions.showManifestDownloadDialog(
                                            "parquet",
                                            filters
                                        )
                                    );
                                };
                            }

                            return subItem;
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
