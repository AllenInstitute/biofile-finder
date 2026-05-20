import { IContextualMenuItem } from "@fluentui/react";
import { Dispatch } from "redux";

import Tutorials from "./Tutorials";
import { interaction, selection } from "../../state";
import { ModalType } from "../../components/Modal";

export default function useHelpOptions(
    dispatch: Dispatch,
    isOnWeb = false,
    isAppRoute = true
): IContextualMenuItem[] {
    const tutorialMenuItems: IContextualMenuItem[] = Object.values(Tutorials).map((tutorial) => {
        return {
            key: tutorial.title,
            text: tutorial.title,
            title: tutorial.description,
            onClick: () => {
                dispatch(selection.actions.selectTutorial(tutorial));
            },
        };
    });
    return [
        ...(isOnWeb
            ? []
            : [
                  {
                      key: "visit-homepage",
                      text: "Visit BioFile Finder homepage",
                      title: "Opens the BioFile Finder homepage in a new window",
                      href: "https://biofile-finder.allencell.org/",
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
                                  key: "All topics",
                                  text: "All topics",
                                  title: "Walk through all of the tutorial topics in sequence",
                                  onClick: () => {
                                      dispatch(selection.actions.runAllTutorials());
                                  },
                              },
                              ...tutorialMenuItems,
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
                      title: "Opens the BioFile Finder download page in a new window",
                      href: "https://alleninstitute.github.io/biofile-finder/",
                      target: "_blank",
                  },
              ]),
        {
            key: "about",
            text: `About`,
            onClick: () => {
                dispatch(interaction.actions.setVisibleModal(ModalType.About));
            },
        },
        {
            key: "issues-page",
            text: "Report issue",
            title: "Opens the BioFile Finder GitHub issues page",
            href: "https://github.com/AllenInstitute/biofile-finder/issues",
            target: "_blank",
        },
        {
            key: "support-forum",
            text: "Support forum",
            title: "Opens support forum in new window",
            href: "https://github.com/AllenInstitute/biofile-finder/discussions/categories/q-a",
            target: "_blank",
        },
        {
            key: "contact-us",
            text: "Contact us",
            title: "Email us directly",
            href: "mailto:aics_software_support@alleninstitute.org",
        },
    ];
}
