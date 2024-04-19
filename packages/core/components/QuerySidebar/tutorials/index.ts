import { IContextualMenuItem } from "@fluentui/react";
import { Dispatch } from "redux";

import { FILTER_FILES_TUTORIAL } from "./FilterFiles";
import { GENERATE_MANIFEST_TUTORIAL } from "./GenerateManifest";
import { MODIFY_COLUMNS_TUTORIAL } from "./ModifyColumns";
import { OPEN_FILES_TUTORIAL } from "./OpenFiles";
import { ORGANIZE_FILES_TUTORIAL } from "./OrganizeFiles";
import { SHARE_VIEW_TUTORIAL } from "./ShareView";
import { SORT_FILES_TUTORIAL } from "./SortFiles";
import { selection } from "../../../state";

export const HELP_OPTIONS = (dispatch: Dispatch): IContextualMenuItem[] => {
    return [
        // TODO: Remove if on web
        {
            key: "download-newest-version",
            text: "Download Newest Version",
            iconProps: {
                iconName: "Download",
            },
            title: "Opens the FMS File Explorer download page",
            href: "https://alleninstitute.github.io/aics-fms-file-explorer-app/",
            target: "_blank",
        },
        {
            key: "tutorials",
            text: "Tutorials",
            iconProps: {
                iconName: "Info",
            },
            title:
                "List of available tutorials useful for getting familiar with the features of this application",
            subMenuProps: {
                items: [
                    {
                        key: "Grouping",
                        text: "Grouping",
                        title:
                            "How to organize the files in the file list into hierarchical folders using the annotations",
                        onClick: () => {
                            dispatch(selection.actions.selectTutorial(ORGANIZE_FILES_TUTORIAL));
                        },
                    },
                    {
                        key: "Filtering",
                        text: "Filtering",
                        title: "How to filter files in the file list",
                        onClick: () => {
                            dispatch(selection.actions.selectTutorial(FILTER_FILES_TUTORIAL));
                        },
                    },
                    {
                        key: "Sorting",
                        text: "Sorting",
                        title: "How to sort the files shown in the file list",
                        onClick: () => {
                            dispatch(selection.actions.selectTutorial(SORT_FILES_TUTORIAL));
                        },
                    },
                    {
                        key: "Modifying columns in file list",
                        text: "Modifying columns in file list",
                        title: "How to modify the columns present in the file list",
                        onClick: () => {
                            dispatch(selection.actions.selectTutorial(MODIFY_COLUMNS_TUTORIAL));
                        },
                    },
                    {
                        key: "Opening files in another application",
                        text: "Opening files in another application",
                        title:
                            "How to open a file in another application without downloading or copying and pasting the file path",
                        onClick: () => {
                            dispatch(selection.actions.selectTutorial(OPEN_FILES_TUTORIAL));
                        },
                    },
                    {
                        key: "Creating Datasets (CSVs)",
                        text: "Creating Datasets (CSVs)",
                        title:
                            'How to create a "Dataset" of file metadata for preservation, ML, or sharing purposes',
                        onClick: () => {
                            dispatch(selection.actions.selectTutorial(GENERATE_MANIFEST_TUTORIAL));
                        },
                    },
                    {
                        key: "Sharing current query",
                        text: "Sharing current query",
                        title:
                            "How to share your current query (i.e. your filters/sorts/open folders etc.)",
                        onClick: () => {
                            dispatch(selection.actions.selectTutorial(SHARE_VIEW_TUTORIAL));
                        },
                    },
                ],
            },
        },
    ];
};
