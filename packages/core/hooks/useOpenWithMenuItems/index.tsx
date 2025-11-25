import { ContextualMenuItemType, DefaultButton, Icon, IContextualMenuItem } from "@fluentui/react";
import { isEmpty } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";

import AnnotationName from "../../entity/Annotation/AnnotationName";
import FileDetail from "../../entity/FileDetail";
import FileFilter from "../../entity/FileFilter";
import { interaction, metadata, selection } from "../../state";

import styles from "./useOpenWithMenuItems.module.css";
import useOpenInCfe from "./useOpenInCfe";
import useRemoteFileUpload from "../useRemoteFileUpload";

const ONE_MEGABYTE = 1024 * 1024;

enum AppKeys {
    AGAVE = "agave",
    BROWSER = "browser",
    NEUROGLANCER = "neuroglancer",
    SIMULARIUM = "simularium",
    VALIDATOR = "validator",
    VOLE = "vole",
    VOLVIEW = "volview",
    CFE = "cfe",
}

interface Apps {
    [AppKeys.AGAVE]: IContextualMenuItem;
    [AppKeys.BROWSER]: IContextualMenuItem;
    [AppKeys.NEUROGLANCER]: IContextualMenuItem;
    [AppKeys.SIMULARIUM]: IContextualMenuItem;
    [AppKeys.VALIDATOR]: IContextualMenuItem;
    [AppKeys.VOLE]: IContextualMenuItem;
    [AppKeys.VOLVIEW]: IContextualMenuItem;
    [AppKeys.CFE]: IContextualMenuItem;
}

type AppOptions = {
    openInCfe: () => void;
    openInVole: () => void;
};

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
    options: Partial<AppOptions> | undefined
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
        href: `https://neuroglancer-demo.appspot.com/#!{%22layers%22:[{%22source%22:%22${
            fileDetails?.path.includes(".n5") ? "n5" : "zarr"
        }://${fileDetails?.path}%22,%22name%22:%22${fileDetails?.name}%22}]}`,
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
    [AppKeys.VALIDATOR]: {
        key: AppKeys.VALIDATOR,
        text: "OME NGFF Validator",
        title: `Open files with OME NGFF Validator`,
        href: `https://ome.github.io/ome-ngff-validator/?source=${fileDetails?.path}`,
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
        text: "Vol-E",
        title: `Open files with Vol-E`,
        onClick: options?.openInVole,
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
    [AppKeys.CFE]: {
        key: AppKeys.CFE,
        text: "Cell Feature Explorer",
        title: `Open files with CFE`,
        onClick: options?.openInCfe,
        hidden: options?.openInCfe === undefined || !fileDetails?.path,
        onRenderContent(props, defaultRenders) {
            return (
                <>
                    {defaultRenders.renderItemName(props)}
                    <span className={styles.secondaryText}>Web</span>
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

function getSupportedApps(
    apps: Apps,
    isSmallFile: boolean,
    fileDetails?: FileDetail
): IContextualMenuItem[] {
    if (!fileDetails) {
        return [];
    }

    const isLikelyLocalFile = fileDetails.isLikelyLocalFile;

    const fileExt = getFileExtension(fileDetails);

    // Check for common file extensions first

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
            return [apps.neuroglancer];
        case "tif":
        case "tiff":
            return isSmallFile ? [apps.agave, apps.vole] : [apps.agave];
        case "zarr":
        case "": // No extension
            return isLikelyLocalFile
                ? [apps.agave, apps.neuroglancer, apps.vole, apps.cfe]
                : [apps.vole, apps.neuroglancer, apps.agave, apps.cfe, apps.validator];
    }

    // Now check for special cases where the path may include a subpath into the container

    if (fileDetails.path.includes(".n5")) {
        return [apps.neuroglancer];
    }

    if (fileDetails.path.includes(".zarr")) {
        return isLikelyLocalFile
            ? [apps.agave, apps.neuroglancer, apps.vole]
            : [apps.vole, apps.neuroglancer, apps.agave, apps.validator];
    }

    return [];
}

function getFileExtension(fileDetails: FileDetail): string {
    return fileDetails.path.slice(fileDetails.path.lastIndexOf(".") + 1).toLowerCase();
}

/**
 * Opens a window at `openUrl`, then attempts to send the data in `entry` to it.
 *
 * This requires a bit of protocol to accomplish:
 * 1. We add some query params to `openUrl` before opening: `msgorigin` is this site's origin for
 *    validation, and `storageid` uniquely identifies the message we want to send.
 * 2. *The opened window must check if these params are present* and post the value of `storageid`
 *    back to us (via `window.opener`, validated using `msgorigin`) once it's loaded and ready.
 * 3. Once we receive that message, we send over `entry`.
 *
 * This is currently only used by `openInVole`, but is broken out into a separate function to
 * emphasize that this protocol is both message- and receiver-agnostic, and could be used to send
 * large bundles of data to other apps as well.
 */
function openWindowWithMessage(openUrl: URL, entry: any): void {
    if (entry === undefined || entry === null) {
        window.open(openUrl);
        return;
    }

    const storageid = uuidv4();
    openUrl.searchParams.append("msgorigin", window.location.origin);
    openUrl.searchParams.append("storageid", storageid);

    const handle = window.open(openUrl);
    const loadHandler = (event: MessageEvent): void => {
        if (event.origin !== openUrl.origin || event.data !== storageid) {
            return;
        }
        handle?.postMessage(entry, openUrl.origin);
        window.removeEventListener("message", loadHandler);
    };

    window.addEventListener("message", loadHandler);
    // ensure handlers can't build up with repeated failed requests
    window.setTimeout(() => window.removeEventListener("message", loadHandler), 60000);
}

export default (fileDetails?: FileDetail, filters?: FileFilter[]): IContextualMenuItem[] => {
    const path = fileDetails?.path;
    const size = fileDetails?.size;

    const dispatch = useDispatch();
    const isOnWeb = useSelector(interaction.selectors.isOnWeb);
    const isAicsEmployee = useSelector(interaction.selectors.isAicsEmployee);
    const userSelectedApplications = useSelector(interaction.selectors.getUserSelectedApplications);
    const { fileDownloadService, executionEnvService } = useSelector(
        interaction.selectors.getPlatformDependentServices
    );
    const annotationNameToAnnotationMap = useSelector(
        metadata.selectors.getAnnotationNameToAnnotationMap
    );
    const loadBalancerBaseUrl = useSelector(interaction.selectors.getLoadBalancerBaseUrl);
    const fileService = useSelector(interaction.selectors.getFileService);

    const fileSelection = useSelector(selection.selectors.getFileSelection);
    const annotationNames = React.useMemo(
        () => Array.from(Object.keys(annotationNameToAnnotationMap)).sort(),
        [annotationNameToAnnotationMap]
    );
    const [isSmallFile, setIsSmallFile] = React.useState(false);

    const remoteServerConnection = useRemoteFileUpload();
    const openInCfe = useOpenInCfe(
        remoteServerConnection,
        fileSelection,
        annotationNames,
        fileService
    );

    // TODO custom hook this, like `useOpenInCfe`?
    const openInVole = React.useCallback(async (): Promise<void> => {
        // TODO change to vole.allencell.org
        const VOLE_BASE_URL = "http://localhost:9020/viewer";

        const allDetails = await fileSelection.fetchAllDetails();
        const details = allDetails.filter((detail) => {
            const fileExt = getFileExtension(detail);
            return fileExt === "zarr" || fileExt === "";
        });

        const scenes: string[] = [];
        const meta: Record<string, Record<string, unknown>> = {};

        for (const detail of details) {
            const sceneMeta: Record<string, unknown> = {};
            for (const annotation of detail.annotations) {
                const isSingleValue = annotation.values.length === 1;
                const value = isSingleValue ? annotation.values[0] : annotation.values;
                sceneMeta[annotation.name] = value;
            }
            scenes.push(detail.path);
            meta[detail.path] = sceneMeta;
        }

        const openUrl = new URL(VOLE_BASE_URL);

        // Start on the focused scene
        const sceneIdx = details.findIndex((detail) => detail.path === fileDetails?.path);
        if (sceneIdx > 0) {
            openUrl.searchParams.append("scene", sceneIdx.toString());
        }

        // Prefer putting the image URLs directly in the query string for easy sharing, if the
        // length of the URL would be reasonable
        const includeUrls =
            details.length <= 5 ||
            details.reduce((acc, detail) => acc + detail.path.length + 1, 0) <= 250;

        if (includeUrls) {
            // We can fit all the URLs we want
            openUrl.searchParams.append("url", details.map(({ path }) => path).join("+"));
        } else {
            // There are more scene URLs than we want to put in the full path.
            // Just include the first one and a hint to how many scenes we're opening;
            // send the rest in a message once the new window opens.
            const initialImageUrl = details[Math.max(sceneIdx, 0)].path;
            openUrl.searchParams.append("url", initialImageUrl);
            openUrl.searchParams.append("msgscenes", details.length.toString());
        }

        // TODO don't send scenes and/or metadata when not present (e.g. check `includeUrls`)
        openWindowWithMessage(openUrl, { scenes, meta });
    }, [fileDetails, fileSelection]);

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
                    (app.filePath.toLowerCase().includes("zen") &&
                        !fileDetails?.getFirstAnnotationValue(AnnotationName.LOCAL_FILE_PATH)),
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

    const apps = APPS(fileDetails, { openInCfe, openInVole });

    // Determine is the file is small or not asynchronously
    React.useEffect(() => {
        async function determineFileSize() {
            if (path) {
                let fileSize = size;
                if (!fileSize) {
                    try {
                        fileSize = await fileDownloadService.getHttpObjectSize(path);
                    } catch (_err) {
                        console.debug(
                            `Failed to get size of ${path}. Unable to determine if Vol-E is suitable viewer.`
                        );
                    }
                }

                // Consider a "small" file to be <= 100Mb
                setIsSmallFile(!!fileSize && fileSize <= 100 * ONE_MEGABYTE);
            }
        }
        determineFileSize();
    }, [path, size, fileDownloadService, setIsSmallFile]);

    const supportedApps = [...getSupportedApps(apps, isSmallFile, fileDetails), ...userApps];
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
