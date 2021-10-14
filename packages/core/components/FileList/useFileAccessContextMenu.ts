import { ContextualMenuItemType, IContextualMenuItem } from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import FileFilter from "../../entity/FileFilter";
import { interaction, selection } from "../../state";
import { ContextMenuItem } from "../ContextMenu";
import getContextMenuItems, { ContextMenuActions } from "../ContextMenu/items";

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
    const userSelectedApplications = useSelector(interaction.selectors.getUserSelectedApplications);
    const { executionEnvService } = useSelector(interaction.selectors.getPlatformDependentServices);

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
        [dispatch, fileSelection, executionEnvService, userSelectedApplications, filters, onDismiss]
    );
}
