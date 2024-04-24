import { ActionButton, ContextualMenuItemType, IContextualMenuItem } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { ContextMenuActions } from "../ContextMenu/items";
import { interaction } from "../../state";
import FileDetail from "../../entity/FileDetail";
import FileFilter from "../../entity/FileFilter";

import styles from "./OpenFileButton.module.css";

interface Props {
    className?: string;
    fileDetails: FileDetail | null;
}

/**
 * Button for dispatching open file actions.
 */
export default function OpenFileButton(props: Props) {
    const { fileDetails } = props;

    const dispatch = useDispatch();
    const userSelectedApplications = useSelector(interaction.selectors.getUserSelectedApplications);
    const { executionEnvService } = useSelector(interaction.selectors.getPlatformDependentServices);

    const openMenuItems: IContextualMenuItem[] = React.useMemo(() => {
        if (!fileDetails) {
            return [];
        }

        const savedApps: IContextualMenuItem[] = (userSelectedApplications || []).map((app) => {
            const name = executionEnvService.getFilename(app.filePath);
            return {
                key: `open-with-${name}`,
                text: name,
                title: `Open files with ${name}`,
                onClick() {
                    dispatch(interaction.actions.openWith(app, undefined, [fileDetails]));
                },
            };
        });

        savedApps.push({
            key: ContextMenuActions.OPEN_3D_WEB_VIEWER,
            text: "3D Web Viewer",
            title: `Open files with 3D Web Viewer`,
            href: `https://allen-cell-animated.github.io/website-3d-cell-viewer/?url=${fileDetails.path}/`,
            target: "_blank",
        });

        return [
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
                    dispatch(
                        interaction.actions.promptForNewExecutable([
                            new FileFilter("file_id", fileDetails.id),
                        ])
                    );
                },
            },
        ];
    }, [dispatch, fileDetails, userSelectedApplications, executionEnvService]);

    if (!fileDetails) {
        return null;
    }

    return (
        <ActionButton
            className={classNames(styles.commandButton, props.className)}
            menuProps={{
                className: styles.buttonMenu,
                items: openMenuItems,
            }}
            iconProps={{
                iconName: "OpenInNewWindow",
            }}
            text="Open"
        />
    );
}
