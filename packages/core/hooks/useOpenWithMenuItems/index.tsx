import { ContextualMenuItemType, DefaultButton, Icon, IContextualMenuItem } from "@fluentui/react";
import { isEmpty } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import FileDetail from "../../entity/FileDetail";
import FileSelection from "../../entity/FileSelection";
import FileFilter from "../../entity/FileFilter";
import { interaction, metadata } from "../../state";
import useMessageExternalSite from "../useMessageExternalSite";

import styles from "./useOpenWithMenuItems.module.css";

enum AppKeys {
    AGAVE = "agave",
    BROWSER = "browser",
    NEUROGLANCER = "neuroglancer",
    SIMULARIUM = "simularium",
    VOLE = "vole",
    VOLVIEW = "volview",
}

interface Apps {
    [AppKeys.AGAVE]: IContextualMenuItem;
    [AppKeys.BROWSER]: IContextualMenuItem;
    [AppKeys.NEUROGLANCER]: IContextualMenuItem;
    [AppKeys.SIMULARIUM]: IContextualMenuItem;
    [AppKeys.VOLE]: IContextualMenuItem;
    [AppKeys.VOLVIEW]: IContextualMenuItem;
}

const SUPPORTED_APPS_HEADER = {
    key: "supported-apps-headers",
    text: "SUPPORT FILE TYPE",
    title: "Apps that are expected to support this file type",
    itemType: ContextualMenuItemType.Header,
};

const UNSUPPORTED_APPS_HEADER = {
    key: "unsupported-apps-headers",
    text: "DO NOT SUPPORT FILE TYPE",
    title: "Apps that are not expected to support this file type",
    itemType: ContextualMenuItemType.Header,
};

const APPS = (
    fileDetails: FileDetail | undefined,
    fileSelection: FileSelection,
    openSelectionInVole: (e: React.MouseEvent<HTMLButtonElement>) => void
): Apps => ({
    [AppKeys.AGAVE]: {
        key: AppKeys.AGAVE,
        // TODO: Upgrade styling here
        className: styles.desktopMenuItem,
        text: "AGAVE",
        title: "Open files with AGAVE v1.7.2+",
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
                        <DefaultButton
                            className={styles.infoButton}
                            title="Get info or download to enable use"
                        >
                            Info
                            <Icon iconName="OpenInNewWindow" />
                        </DefaultButton>
                    </a>
                    <span className={styles.secondaryText}>| Desktop</span>
                </>
            );
        },
    } as IContextualMenuItem,
    [AppKeys.BROWSER]: {
        key: AppKeys.BROWSER,
        text: "Browser",
        title: `Open files in the current browser in a new tab`,
        href: fileDetails?.path,
        disabled: !fileDetails?.path,
        target: "_blank",
        onRenderContent(props, defaultRenders) {
            return (
                <>
                    {defaultRenders.renderItemName(props)}
                    <span className={styles.secondaryText}>Web</span>
                </>
            );
        },
    } as IContextualMenuItem,
    [AppKeys.NEUROGLANCER]: {
        key: AppKeys.NEUROGLANCER,
        text: "Neuroglancer",
        title: `Open files with Neuroglancer`,
        href: `https://neuroglancer-demo.appspot.com/#!{%22layers%22:[{%22source%22:%22zarr://${fileDetails?.path}%22,%22name%22:%22${fileDetails?.name}%22}]}`,
        disabled: !fileDetails?.path,
        target: "_blank",
        onRenderContent(props, defaultRenders) {
            return (
                <>
                    {defaultRenders.renderItemName(props)}
                    <span className={styles.secondaryText}>Web</span>
                </>
            );
        },
    } as IContextualMenuItem,
    [AppKeys.SIMULARIUM]: {
        key: AppKeys.SIMULARIUM,
        text: "Simularium",
        title: `Open files with Simularium`,
        href: `https://simularium.allencell.org/viewer?trajUrl=${fileDetails?.path}`,
        disabled: !fileDetails?.path,
        target: "_blank",
        onRenderContent(props, defaultRenders) {
            return (
                <>
                    {defaultRenders.renderItemName(props)}
                    <span className={styles.secondaryText}>Web</span>
                </>
            );
        },
    } as IContextualMenuItem,
    [AppKeys.VOLE]: {
        key: AppKeys.VOLE,
        className: styles.desktopMenuItem,
        text: "Vol-E",
        title: `Open file with Vol-E`,
        href: `https://vole.allencell.org/viewer?url=${fileDetails?.path}/`,
        disabled: !fileDetails?.path,
        target: "_blank",
        onRenderContent(props, defaultRenders) {
            const isMultiSelection = fileSelection ? fileSelection.count() > 1 : false;
            const secondaryText = isMultiSelection ? "| Web" : "Web";
            return (
                <>
                    {defaultRenders.renderItemName(props)}
                    {isMultiSelection && (
                        <DefaultButton
                            className={styles.infoButton}
                            title="Open all selected files with Vol-E"
                            onClick={openSelectionInVole}
                        >
                            Open selected
                        </DefaultButton>
                    )}
                    <span className={styles.secondaryText}>{secondaryText}</span>
                </>
            );
        },
    } as IContextualMenuItem,
    [AppKeys.VOLVIEW]: {
        key: AppKeys.VOLVIEW,
        text: "VolView",
        title: `Open files with VolView`,
        href: `https://volview.kitware.app/?urls=[${fileDetails?.path}]`,
        disabled: !fileDetails?.path,
        target: "_blank",
        onRenderContent(props, defaultRenders) {
            return (
                <>
                    {defaultRenders.renderItemName(props)}
                    <span className={styles.secondaryText}>Web</span>
                </>
            );
        },
    } as IContextualMenuItem,
});

function getSupportedApps(apps: Apps, fileDetails?: FileDetail): IContextualMenuItem[] {
    if (!fileDetails) {
        return [];
    }

    const isLikelyLocalFile =
        !fileDetails.path.startsWith("http") && !fileDetails.path.startsWith("s3");

    const fileExt = fileDetails.path.slice(fileDetails.path.lastIndexOf(".") + 1).toLowerCase();
    switch (fileExt) {
        case "bmp":
        case "html":
        case "gif":
        case "jpg":
        case "jpeg":
        case "pdf":
        case "png":
        case "svg":
        case "txt":
        case "xml":
            return [apps.browser];
        case "simularium":
            return [apps.simularium];
        case "dcm":
            return [apps.volview];
        case "dvi":
        case "n5":
            return [apps.neuroglancer];
        case "tiff":
            return [apps.agave];
        case "zarr":
        case "": // No extension
            return isLikelyLocalFile
                ? [apps.agave, apps.neuroglancer, apps.vole]
                : [apps.vole, apps.neuroglancer, apps.agave];
        default:
            return [];
    }
}

export default (
    fileDetails: FileDetail | undefined,
    fileSelection: FileSelection,
    filters?: FileFilter[]
): IContextualMenuItem[] => {
    const dispatch = useDispatch();
    const isOnWeb = useSelector(interaction.selectors.isOnWeb);
    const isAicsEmployee = useSelector(interaction.selectors.isAicsEmployee);
    const userSelectedApplications = useSelector(interaction.selectors.getUserSelectedApplications);
    const { executionEnvService } = useSelector(interaction.selectors.getPlatformDependentServices);
    const annotationNameToAnnotationMap = useSelector(
        metadata.selectors.getAnnotationNameToAnnotationMap
    );
    const loadBalancerBaseUrl = useSelector(interaction.selectors.getLoadBalancerBaseUrl);
    const [sendMessageToVole, setOnReceiveFromVole] = useMessageExternalSite(
        "https://vole.allencell.org/write_storage"
    );

    const openSelectionInVole = React.useCallback(
        async (e: React.MouseEvent<HTMLButtonElement>) => {
            e.preventDefault();
            const details = await fileSelection.fetchAllDetails();
            const scenes = [];
            const meta: Record<string, unknown>[] = [];

            for (const detail of details) {
                const sceneMeta: Record<string, unknown> = {};
                for (const annotation of detail.annotations) {
                    const singleValue = annotation.values.length === 1;
                    const value = singleValue ? annotation.values[0] : annotation.values;
                    sceneMeta[annotation.name] = value;
                }
                scenes.push(detail.path);
                meta.push(sceneMeta);
            }

            sendMessageToVole({ scenes, meta });
            setOnReceiveFromVole((message) => {
                if (message === "SUCCESS") {
                    window.open("https://vole.allencell.org/viewer?url=storage");
                }
            });
        },
        [fileSelection, sendMessageToVole, setOnReceiveFromVole]
    );

    const plateLink = fileDetails?.getLinkToPlateUI(loadBalancerBaseUrl);
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

    const authorDefinedApps = Object.entries(annotationNameToLinkMap).map(
        ([name, link]): IContextualMenuItem =>
            ({
                key: name,
                text: name,
                title: `Open link - ${name}`,
                href: link,
                target: "_blank",
                onRenderContent(props, defaultRenders) {
                    return (
                        <>
                            {defaultRenders.renderItemName(props)}
                            <span className={styles.secondaryText}>Web</span>
                        </>
                    );
                },
            } as IContextualMenuItem)
    );

    const userApps = (userSelectedApplications || [])
        .map((app) => {
            const name = executionEnvService.getFilename(app.filePath);
            return {
                key: `open-with-${name}`,
                text: name,
                title: `Open files with ${name}`,
                disabled:
                    (!filters && !fileDetails) ||
                    (app.filePath.toLowerCase().includes("zen") && !fileDetails?.localPath),
                onClick() {
                    if (filters) {
                        dispatch(interaction.actions.openWith(app, filters));
                    } else if (fileDetails) {
                        dispatch(interaction.actions.openWith(app, undefined, [fileDetails]));
                    }
                },
                onRenderContent(props, defaultRenders) {
                    return (
                        <>
                            {defaultRenders.renderItemName(props)}
                            <span className={styles.secondaryText}>Desktop</span>
                        </>
                    );
                },
            } as IContextualMenuItem;
        })
        .sort((a, b) => (a.text || "").localeCompare(b.text || ""));

    const apps = APPS(fileDetails, fileSelection, openSelectionInVole);
    const supportedApps = [...getSupportedApps(apps, fileDetails), ...userApps];
    // Grab every other known app
    const unsupportedApps = Object.values(apps)
        .filter((app) => supportedApps.every((item) => item.key !== app.key))
        .sort((a, b) => (a.text || "").localeCompare(b.text || ""));

    if (plateLink && isAicsEmployee) {
        supportedApps.push({
            key: "open-plate-ui",
            text: "LabKey Plate UI",
            title: "Open this plate in the Plate UI",
            href: plateLink,
            target: "_blank",
            onRenderContent(props, defaultRenders) {
                return (
                    <>
                        {defaultRenders.renderItemName(props)}
                        <span className={styles.secondaryText}>Web</span>
                    </>
                );
            },
        } as IContextualMenuItem);
    }

    // Add placeholder message if no supported apps found
    if (!supportedApps.length) {
        supportedApps.push({
            key: "no-supported-apps-found",
            text: "None",
            title: "No applications found that are expected to support this file type",
            disabled: true,
        });
    }

    if (!unsupportedApps.length) {
        unsupportedApps.push({
            key: "no-unsupported-apps-found",
            text: "None",
            title: "No applications found that are not expected to support this file type",
            disabled: true,
        });
    }

    // Priority apps are those that are known to work well with the file type
    // or those defined by the author of the dataset
    const menuItems: IContextualMenuItem[] = [];
    const subMenuItems: IContextualMenuItem[] = [];
    if (authorDefinedApps.length) {
        menuItems.push(...authorDefinedApps);
        subMenuItems.push(SUPPORTED_APPS_HEADER, ...supportedApps);
    } else {
        menuItems.push(SUPPORTED_APPS_HEADER, ...supportedApps);
    }

    subMenuItems.push(UNSUPPORTED_APPS_HEADER, ...unsupportedApps);

    // Unable to open arbirary applications on the web
    // this adds to the bottom of the "Other apps" sub menu
    if (!isOnWeb) {
        subMenuItems.push(
            {
                key: "other-divider",
                className: styles.divider,
                itemType: ContextualMenuItemType.Divider,
            },
            {
                key: "other...",
                text: "Other...",
                title: "Select an application to open the selection with",
                onClick() {
                    dispatch(interaction.actions.promptForNewExecutable(filters));
                },
            }
        );
    }

    if (!isEmpty(subMenuItems)) {
        menuItems.push(
            {
                key: "other-apps-divider",
                className: styles.divider,
                itemType: ContextualMenuItemType.Divider,
            },
            {
                key: "other-apps",
                text: "Other apps",
                title: "Other applications that are not recommended for this file",
                subMenuProps: {
                    items: subMenuItems,
                },
            }
        );
    }

    return menuItems;
};
