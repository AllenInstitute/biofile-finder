import { ContextualMenuItemType, IContextualMenuItem, Icon } from "@fluentui/react";
import { isEmpty } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import FileDetail from "../../entity/FileDetail";
import FileFilter from "../../entity/FileFilter";
import { interaction, metadata } from "../../state";

import styles from "./useOpenWithMenuItems.module.css";

interface WebApps {
    neuroglancer: IContextualMenuItem;
    simularium: IContextualMenuItem;
    volumeviewer: IContextualMenuItem;
    volview: IContextualMenuItem;
}

const WEB_APPS = (fileDetails?: FileDetail): WebApps => ({
    volumeviewer: {
        key: "3d-web-viewer",
        text: "3D Web Viewer",
        title: `Open files with 3D Web Viewer`,
        href: `https://volumeviewer.allencell.org/viewer?url=${fileDetails?.cloudPath}/`,
        disabled: !fileDetails?.path,
        target: "_blank",
    },
    neuroglancer: {
        key: "neuroglancer",
        text: "Neuroglancer",
        title: `Open files with Neuroglancer`,
        href: `https://neuroglancer-demo.appspot.com/#!{%22layers%22:[{%22source%22:%22zarr://${fileDetails?.cloudPath}%22,%22name%22:%22${fileDetails?.name}%22}]}`,
        disabled: !fileDetails?.path,
        target: "_blank",
    },
    simularium: {
        key: "simularium",
        text: "Simularium",
        title: `Open files with Simularium`,
        href: `https://simularium.allencell.org/viewer?trajUrl=${fileDetails?.cloudPath}`,
        target: "_blank",
    },
    volview: {
        key: "volview",
        text: "VolView",
        title: `Open files with VolView`,
        href: `https://volview.kitware.app/?urls=[${fileDetails?.cloudPath}]`,
        disabled: !fileDetails?.path,
        target: "_blank",
    },
});

const DESKTOP_APPS = (fileDetails?: FileDetail): { agave: IContextualMenuItem } => ({
    agave: {
        key: "agave",
        className: styles.agaveLink,
        text: "AGAVE",
        title: `Open files with AGAVE`,
        href: `agave://?url=${fileDetails?.path}`,
        disabled: !fileDetails?.path,
        target: "_blank",
        onRenderContent(props, defaultRenders) {
            return (
                <>
                    {defaultRenders.renderItemName(props)}
                    <a
                        className={styles.viewLink}
                        href="https://www.allencell.org/pathtrace-rendering.html"
                        rel="noreferrer"
                        target="_blank"
                    >
                        | View info
                        <Icon iconName="Link" />
                    </a>
                </>
            );
        },
    } as IContextualMenuItem,
});

function getWebAppMenuItems(fileDetails?: FileDetail): IContextualMenuItem[] {
    switch (true) {
        case fileDetails?.name.includes(".simularium"):
            return [WEB_APPS(fileDetails).simularium];
        case fileDetails?.name.includes(".dcm"):
            return [WEB_APPS(fileDetails).volview];
        default:
            return [WEB_APPS(fileDetails).volumeviewer, WEB_APPS(fileDetails).neuroglancer];
    }
}

function getDesktopAppMenuItems(fileDetails?: FileDetail): IContextualMenuItem[] {
    return [DESKTOP_APPS(fileDetails).agave];
}

export default (fileDetails?: FileDetail, filters?: FileFilter[]): IContextualMenuItem[] => {
    const dispatch = useDispatch();
    const isOnWeb = useSelector(interaction.selectors.isOnWeb);
    const isAicsEmployee = useSelector(interaction.selectors.isAicsEmployee);
    const userSelectedApplications = useSelector(interaction.selectors.getUserSelectedApplications);
    const { executionEnvService } = useSelector(interaction.selectors.getPlatformDependentServices);
    const annotationNameToAnnotationMap = useSelector(
        metadata.selectors.getAnnotationNameToAnnotationMap
    );
    const fileExplorerServiceBaseUrl = useSelector(
        interaction.selectors.getFileExplorerServiceBaseUrl
    );

    const plateLink = fileDetails?.getLinkToPlateUI(fileExplorerServiceBaseUrl);
    const annotationNameToLinkMap = React.useMemo(
        () =>
            fileDetails?.annotations
                .filter(
                    (annotation) => annotationNameToAnnotationMap[annotation.name]?.isOpenFileLink
                )
                .reduce(
                    (mapThusFar, annotation) => ({
                        ...mapThusFar,
                        [annotation.name]: annotation.values.join(",") as string,
                    }),
                    {} as { [annotationName: string]: string }
                ) || {},
        [fileDetails, annotationNameToAnnotationMap]
    );

    const priorityWebApps = getWebAppMenuItems(fileDetails);
    // Grab every other web app that isn't in the priority list
    const otherWebApps = Object.values(WEB_APPS(fileDetails)).filter((app) =>
        priorityWebApps.every((item) => item.key !== app.key)
    );
    const priorityDesktopApps = getDesktopAppMenuItems(fileDetails);
    // Grab every other desktop app that isn't in the priority list
    const otherDesktopApps = Object.values(DESKTOP_APPS(fileDetails)).filter((app) =>
        priorityDesktopApps.every((item) => item.key !== app.key)
    );

    return [
        ...(isEmpty(annotationNameToLinkMap)
            ? []
            : [
                  {
                      key: "custom-links",
                      text: "AUTHOR DEFINED",
                      title: "User defined links for this file",
                      itemType: ContextualMenuItemType.Header,
                  },
              ]),
        ...Object.entries(annotationNameToLinkMap).map(([name, link]) => ({
            key: name,
            text: name,
            title: `Open link - ${name}`,
            href: link,
            target: "_blank",
        })),
        {
            key: "web-apps",
            text: "WEB APPS",
            title: "Web applications (no installation necessary)",
            itemType: ContextualMenuItemType.Header,
        },
        ...priorityWebApps,
        ...(plateLink && isAicsEmployee
            ? [
                  {
                      key: "open-plate-ui",
                      text: "LabKey Plate UI",
                      title: "Open this plate in the Plate UI",
                      href: plateLink,
                      target: "_blank",
                  },
              ]
            : []),
        {
            key: "desktop-apps",
            text: "DESKTOP APPS",
            title: "Desktop applications (installation required)",
            itemType: ContextualMenuItemType.Header,
        },
        ...[
            ...priorityDesktopApps,
            ...(userSelectedApplications || []).map((app) => {
                const name = executionEnvService.getFilename(app.filePath);
                return {
                    key: `open-with-${name}`,
                    text: name,
                    title: `Open files with ${name}`,
                    disabled: !filters && !fileDetails,
                    onClick() {
                        if (filters) {
                            dispatch(interaction.actions.openWith(app, filters));
                        } else if (fileDetails) {
                            dispatch(interaction.actions.openWith(app, undefined, [fileDetails]));
                        }
                    },
                };
            }),
        ].sort((a, b) => (a.text || "").localeCompare(b.text || "")),
        {
            key: "other-apps",
            text: "OTHER APPS",
            title: "Other applications that are not expected to support this file type",
            itemType: ContextualMenuItemType.Header,
        },
        ...otherWebApps,
        ...otherDesktopApps,
        ...(isOnWeb
            ? // Unable to open arbitrary applications on the web at the moment
              []
            : [
                  {
                      key: "other...",
                      text: "Other...",
                      title: "Select an application to open the selection with",
                      onClick() {
                          dispatch(interaction.actions.promptForNewExecutable(filters));
                      },
                  },
              ]),
    ];
};
