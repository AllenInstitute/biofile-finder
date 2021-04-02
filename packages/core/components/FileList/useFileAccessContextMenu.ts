import { IContextualMenuItem } from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { AnnotationName } from "../../constants";
import { interaction, selection } from "../../state";
import getContextMenuItems, { ContextMenuActions } from "../ContextMenu/items";
import { ModalType } from "../Modal";

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
            const kinds = selectedFilesDetails.flatMap(
                (file) =>
                    file.annotations.find((a) => a.name === AnnotationName.KIND)?.values as string[]
            );
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
                    if (fileKinds.some((k) => app.defaultFileKinds.includes(k))) {
                        defaultApps.push({
                            key: `open-with-${app.name}`,
                            text: `Open with ${app.name} (default)`,
                            title: `Open files with ${app.name}`,
                            onClick() {
                                dispatch(interaction.actions.openFilesWithApplication(app));
                            },
                        });
                    } else {
                        otherSavedApps.push({
                            key: `open-with-${app.name}`,
                            text: app.name,
                            title: `Open files with ${app.name}`,
                            onClick() {
                                dispatch(interaction.actions.openFilesWithApplication(app));
                            },
                        });
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
                                            interaction.actions.setVisibleModal(
                                                ModalType.ApplicationSelection
                                            )
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
