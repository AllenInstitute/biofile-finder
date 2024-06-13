import { IContextualMenuItem } from "@fluentui/react";
import React from "react";
import { Dispatch } from "redux";

import { FILTER_FILES_TUTORIAL } from "./FilterFiles";
import { GENERATE_MANIFEST_TUTORIAL } from "./GenerateManifest";
import { MODIFY_COLUMNS_TUTORIAL } from "./ModifyColumns";
import { OPEN_FILES_TUTORIAL } from "./OpenFiles";
import { ORGANIZE_FILES_TUTORIAL } from "./OrganizeFiles";
import { SHARE_VIEW_TUTORIAL } from "./ShareView";
import { SORT_FILES_TUTORIAL } from "./SortFiles";
import { selection } from "../../state";

export default function useHelpOptions(
    dispatch: Dispatch,
    isOnWeb = false,
    isAppRoute = true
): IContextualMenuItem[] {
    return React.useMemo(
        () => [
            ...(isOnWeb
                ? []
                : [
                      {
                          key: "visit-homepage",
                          text: "Visit BioFile Finder homepage",
                          title: "Opens the BioFile Finder homepage in a new window",
                          href: "https://alleninstitute.github.io/aics-fms-file-explorer-app/",
                          target: "_blank",
                      },
                  ]),
            ...(!isAppRoute
                ? []
                : [
                      {
                          key: "tutorials",
                          text: "In-app tutorials",
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
                                          dispatch(
                                              selection.actions.selectTutorial(
                                                  ORGANIZE_FILES_TUTORIAL
                                              )
                                          );
                                      },
                                  },
                                  {
                                      key: "Filtering",
                                      text: "Filtering",
                                      title: "How to filter files in the file list",
                                      onClick: () => {
                                          dispatch(
                                              selection.actions.selectTutorial(
                                                  FILTER_FILES_TUTORIAL
                                              )
                                          );
                                      },
                                  },
                                  {
                                      key: "Sorting",
                                      text: "Sorting",
                                      title: "How to sort the files shown in the file list",
                                      onClick: () => {
                                          dispatch(
                                              selection.actions.selectTutorial(SORT_FILES_TUTORIAL)
                                          );
                                      },
                                  },
                                  {
                                      key: "Modifying columns in file list",
                                      text: "Modifying columns in file list",
                                      title: "How to modify the columns present in the file list",
                                      onClick: () => {
                                          dispatch(
                                              selection.actions.selectTutorial(
                                                  MODIFY_COLUMNS_TUTORIAL
                                              )
                                          );
                                      },
                                  },
                                  {
                                      key: "Opening files in another application",
                                      text: "Opening files in another application",
                                      title:
                                          "How to open a file in another application without downloading or copying and pasting the file path",
                                      onClick: () => {
                                          dispatch(
                                              selection.actions.selectTutorial(OPEN_FILES_TUTORIAL)
                                          );
                                      },
                                  },
                                  {
                                      key: "Creating datasets (ex. CSVs)",
                                      text: "Creating datasets (ex. CSVs)",
                                      title:
                                          'How to create a "Dataset" of file metadata for preservation, ML, or sharing purposes',
                                      onClick: () => {
                                          dispatch(
                                              selection.actions.selectTutorial(
                                                  GENERATE_MANIFEST_TUTORIAL
                                              )
                                          );
                                      },
                                  },
                                  {
                                      key: "Sharing current query",
                                      text: "Sharing current query",
                                      title:
                                          "How to share your current query (i.e. your filters/sorts/open folders etc.)",
                                      onClick: () => {
                                          dispatch(
                                              selection.actions.selectTutorial(SHARE_VIEW_TUTORIAL)
                                          );
                                      },
                                  },
                              ],
                          },
                      },
                  ]),
            ...(isOnWeb
                ? []
                : [
                      {
                          key: "download-newest-version",
                          text: "Download Newest Version",
                          title: "Opens the FMS File Explorer download page in a new window",
                          href: "https://alleninstitute.github.io/aics-fms-file-explorer-app/",
                          target: "_blank",
                      },
                  ]),
            {
                key: "github",
                text: `Visit GitHub page`,
                href: "https://github.com/AllenInstitute/aics-fms-file-explorer-app",
                target: "_blank",
            },
            {
                key: "gh-issues-page",
                text: "Report issue in GitHub",
                title: "Opens the FMS File Explorer GitHub issues page",
                href: "https://github.com/AllenInstitute/aics-fms-file-explorer-app/issues",
                target: "_blank",
            },
            {
                key: "allen-cell-discussion-forum",
                text: "Allen Cell Discussion Forum",
                title: "Opens allen cell discussion forum in new window",
                href: "https://forum.allencell.org/c/software-code/11",
                target: "_blank",
            },
        ],
        [dispatch, isOnWeb, isAppRoute]
    );
}
