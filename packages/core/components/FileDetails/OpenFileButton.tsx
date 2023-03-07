import {
    CommandButton,
    ContextualMenuItemType,
    IButtonStyles,
    IContextualMenuProps,
} from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction } from "../../state";
import FileDetail from "../../entity/FileDetail";
import FileFilter from "../../entity/FileFilter";

import styles from "./OpenFileButton.module.css";

interface Props {
    buttonStyles?: IButtonStyles;
    fileDetails: FileDetail | null;
}

/**
 * Button for dispatching open file actions.
 */
export default function OpenFileButton(props: Props) {
    const { fileDetails } = props;

    const dispatch = useDispatch();
    const userSelectedApplications =
        useSelector(interaction.selectors.getUserSelectedApplications) || [];
    const { executionEnvService } = useSelector(interaction.selectors.getPlatformDependentServices);

    const openMenuProps: IContextualMenuProps = React.useMemo(() => {
        if (!fileDetails) {
            return { items: [] };
        }

        return {
            items: [
                ...userSelectedApplications
                    .map((app) => ({ ...app, name: executionEnvService.getFilename(app.filePath) }))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((app) => ({
                        key: `open-with-${app.name}`,
                        text: app.name,
                        title: `Open files with ${app.name}`,
                        onClick() {
                            dispatch(
                                interaction.actions.openWith(app, undefined, [fileDetails.details])
                            );
                        },
                    })),
                ...(userSelectedApplications.length > 0
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
                    key: "Other...",
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
            ],
        };
    }, [dispatch, fileDetails, userSelectedApplications, executionEnvService]);

    if (!fileDetails) {
        return null;
    }

    return (
        <CommandButton
            split
            className={styles.commandButton}
            menuProps={openMenuProps}
            onClick={() =>
                dispatch(interaction.actions.openWithDefault(undefined, [fileDetails.details]))
            }
            text="Open"
            title="Open with default"
            styles={props.buttonStyles}
        />
    );
}
