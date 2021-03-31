import { IContextualMenuItem } from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { interaction, selection } from "../../state";
import getContextMenuItems, { ContextMenuActions } from "../ContextMenu/items";

/**
 * Custom React hook for creating the file access context menu.
 *
 * File access context menu items are dynamically generated from a list of
 * previously saved applications. The list generated also prioritizes
 * displaying context menu items that are the default for the "Kind" of files
 * selected.
 */
export default function useFileAccessContextMenu() {
    const dispatch = useDispatch();
    const [fileKinds, setFileKinds] = React.useState<string[]>([]);
    const fileSelection = useSelector(selection.selectors.getFileSelection);
    const userSelectedApplications = useSelector(interaction.selectors.getKnownApplications);

    React.useEffect(() => {
        async function getFileKinds() {
            const selectedFilesDetails = await fileSelection.fetchAllDetails();
            const kinds = selectedFilesDetails.map((file) => file.kind);
            setFileKinds(kinds);
        }
        getFileKinds();
    }, [fileSelection]);

    return React.useCallback(
        (evt: React.MouseEvent) => {
            // Map apps to context menu options splitting them up by
            // whether they are meant to be the default for the file kind
            // currently selected
            const defaultApps: IContextualMenuItem[] = [];
            const otherSavedApps: IContextualMenuItem[] = [];
            userSelectedApplications
                .sort((a, b) => a.name.localeCompare(b.name))
                .forEach((app) => {
                    const appAsMenuOption = {
                        key: `open-with-${app.name}`,
                        text: app.name,
                        title: `Open files with ${app.name}`,
                        onClick() {
                            dispatch(interaction.actions.openFilesWithApplication(app));
                        },
                    };
                    if (fileKinds.some((k) => app.defaultFileKinds.includes(k))) {
                        defaultApps.push(appAsMenuOption);
                    } else {
                        otherSavedApps.push(appAsMenuOption);
                    }
                });

            const staticItems: IContextualMenuItem[] = getContextMenuItems(dispatch).ACCESS;

            // Combine the static and dynamically generated items
            const items = staticItems
                .flatMap((item) => {
                    if (item.key === ContextMenuActions.OPEN_WITH) {
                        item.subMenuProps = {
                            items: [
                                ...otherSavedApps,
                                // Other is constant option that allows the user
                                // to add another app for file access
                                {
                                    key: ContextMenuActions.OPEN_WITH_OTHER,
                                    text: "Other...",
                                    title: "Select an application to open the selection with",
                                    onClick() {
                                        dispatch(
                                            interaction.actions.promptUserForApplicationSelection()
                                        );
                                    },
                                },
                            ],
                        };
                        return [...defaultApps, item];
                    }
                    return [item];
                })
                .map((item) => ({
                    ...item,
                    disabled: fileSelection.count() === 0,
                }));
            dispatch(interaction.actions.showContextMenu(items, evt.nativeEvent));
        },
        [dispatch, fileKinds, fileSelection, userSelectedApplications]
    );
}
