import { ContextualMenuItemType, IContextualMenuItem } from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import FileFilter from "../../entity/FileFilter";
import { FmsFile } from "../../services/FileService";
import { interaction, selection } from "../../state";
import getContextMenuItems, { ContextMenuActions } from "../ContextMenu/items";

/**
 * Custom React hook for creating the file access context menu.
 *
 * File access context menu items are dynamically generated from a list of
 * previously saved applications. Can be supplied an array of filters to use
 * to find files to access instead of the currently selected files.
 */
export default function useFileAccessContextMenu(
    context?: FmsFile | FileFilter[],
    onDismiss?: () => void
) {
    const dispatch = useDispatch();
    // const fileSelection = useSelector(selection.selectors.getFileSelection);
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
                            dispatch(interaction.actions.openWith(app, context));
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
                // Other is constant option that allows the user
                // to add another app for file access
                {
                    key: ContextMenuActions.OPEN_WITH_OTHER,
                    text: "Other...",
                    title: "Select an application to open the selection with",
                    onClick() {
                        dispatch(interaction.actions.promptForNewExecutable(context));
                    },
                },
            ];

            const items = getContextMenuItems().ACCESS.map((item: IContextualMenuItem) => {
                if (!context) {
                    return {
                        ...item,
                        disabled: true,
                    };
                }

                if (item.key === ContextMenuActions.OPEN_WITH) {
                    item.subMenuProps = { items: openWithOptions };
                } else if (item.key === ContextMenuActions.OPEN) {
                    item.onClick = () => {
                        dispatch(interaction.actions.openWithDefault(context));
                    };
                } else if (item.key === ContextMenuActions.CSV_MANIFEST) {
                    item.onClick = () => {
                        dispatch(interaction.actions.showManifestDownloadDialog(context));
                    };
                } else if (item.key === ContextMenuActions.PYTHON_SNIPPET) {
                    item.onClick = () => {
                        dispatch(interaction.actions.showGeneratePythonSnippetDialog(context));
                    };
                } else if (item.key === ContextMenuActions.DOWNLOAD) {
                    item.onClick = () => {
                        dispatch(interaction.actions.downloadFile(context));
                    };
                }
                return item;
            });

            dispatch(interaction.actions.showContextMenu(items, evt.nativeEvent, onDismiss));
        },
        [dispatch, executionEnvService, userSelectedApplications, context, onDismiss]
    );
}
