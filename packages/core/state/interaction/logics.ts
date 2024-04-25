import { isEmpty, sumBy, throttle, uniqueId } from "lodash";
import { createLogic } from "redux-logic";

import { metadata, ReduxLogicDeps, selection } from "../";
import {
    DOWNLOAD_MANIFEST,
    DownloadManifestAction,
    processSuccess,
    processFailure,
    removeStatus,
    processStart,
    SHOW_CONTEXT_MENU,
    CANCEL_FILE_DOWNLOAD,
    cancelFileDownload,
    CancelFileDownloadAction,
    setCsvColumns,
    REFRESH,
    SET_PLATFORM_DEPENDENT_SERVICES,
    promptUserToUpdateApp,
    OPEN_WITH,
    openWith,
    OpenWithAction,
    OPEN_WITH_DEFAULT,
    processProgress,
    DOWNLOAD_FILES,
    DownloadFilesAction,
    OpenWithDefaultAction,
    BROWSE_FOR_NEW_DATA_SOURCE,
} from "./actions";
import * as interactionSelectors from "./selectors";
import CsvService, { CsvManifestRequest } from "../../services/CsvService";
import {
    DownloadResolution,
    FileDownloadCancellationToken,
} from "../../services/FileDownloadService";
import annotationFormatterFactory, { AnnotationType } from "../../entity/AnnotationFormatter";
import FileSet from "../../entity/FileSet";
import NumericRange from "../../entity/NumericRange";
import {
    ExecutableEnvCancellationToken,
    SystemDefaultAppLocation,
} from "../../services/ExecutionEnvService";
import { UserSelectedApplication } from "../../services/PersistentConfigService";
import FileSelection from "../../entity/FileSelection";
import FileExplorerURL from "../../entity/FileExplorerURL";
import FileDetail from "../../entity/FileDetail";
import { AnnotationName } from "../../entity/Annotation";

/**
 * Interceptor responsible for responding to a SET_PLATFORM_DEPENDENT_SERVICES action and
 * determining if an application update is available.
 */
const checkForUpdates = createLogic({
    type: SET_PLATFORM_DEPENDENT_SERVICES,
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const platformDependentServices = interactionSelectors.getPlatformDependentServices(
            deps.getState()
        );
        try {
            if (await platformDependentServices.applicationInfoService.updateAvailable()) {
                const homepage = "https://alleninstitute.github.io/aics-fms-file-explorer-app/";
                const msg = `A new version of the application is available!<br/>
                Visit the <a href="${homepage}" target="_blank" title="FMS File Explorer homepage">FMS File Explorer homepage</a> to download.`;
                dispatch(promptUserToUpdateApp(uniqueId(), msg));
            }
        } catch (e) {
            console.error("Failed while checking if a newer application version is available", e);
        } finally {
            done();
        }
    },
});

/**
 * Interceptor responsible for responding to a DOWNLOAD_MANIFEST action and triggering a manifest download.
 */
const downloadManifest = createLogic({
    type: DOWNLOAD_MANIFEST,
    warnTimeout: 0, // no way to know how long this will take--don't print console warning if it takes a while
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const {
            payload: { annotations },
        } = deps.action as DownloadManifestAction;
        const manifestDownloadProcessId = uniqueId();

        try {
            const state = deps.getState();
            const {
                databaseService,
                fileDownloadService,
            } = interactionSelectors.getPlatformDependentServices(state);
            let fileSelection = selection.selectors.getFileSelection(state);
            const filters = interactionSelectors.getFileFiltersForVisibleModal(state);
            const fileService = interactionSelectors.getFileService(state);
            const sortColumn = selection.selectors.getSortColumn(state);
            const selectedCollection = selection.selectors.getCollection(state);
            const csvService = new CsvService({
                databaseService,
                downloadService: fileDownloadService,
            });

            // If we have a specific path to get files from ignore selected files
            if (filters.length) {
                const fileSet = new FileSet({
                    filters,
                    fileService,
                    sort: sortColumn,
                });
                const count = await fileSet.fetchTotalCount();
                fileSelection = new FileSelection([
                    {
                        selection: new NumericRange(0, count - 1),
                        fileSet,
                        sortOrder: 0,
                    },
                ]);
            }

            const selections = fileSelection.toCompactSelectionList();

            if (isEmpty(selections)) {
                return;
            }

            const onManifestDownloadCancel = () => {
                dispatch(cancelFileDownload(manifestDownloadProcessId));
            };
            dispatch(
                processStart(
                    manifestDownloadProcessId,
                    "Download of CSV manifest in progress.",
                    onManifestDownloadCancel
                )
            );

            const request: CsvManifestRequest = {
                annotations: annotations.map((annotation) => annotation.name),
                selections,
            };
            const shouldDownloadFromDatabase = !!selectedCollection?.uri;
            let result;
            if (shouldDownloadFromDatabase) {
                result = await csvService.downloadCsvFromDatabase(
                    request,
                    manifestDownloadProcessId
                );
            } else {
                result = await csvService.downloadCsvFromServer(request, manifestDownloadProcessId);
            }

            if (result.resolution === DownloadResolution.CANCELLED) {
                dispatch(removeStatus(manifestDownloadProcessId));
                return;
            } else {
                const successMsg = `Download of CSV manifest successfully finished.<br/>${result.msg}`;
                dispatch(processSuccess(manifestDownloadProcessId, successMsg));
                return;
            }
        } catch (err) {
            const errorMsg = `Download of CSV manifest failed. Details: ${
                err instanceof Error ? err.message : err
            }`;
            dispatch(processFailure(manifestDownloadProcessId, errorMsg));
        } finally {
            dispatch(setCsvColumns(annotations.map((annotation) => annotation.displayName)));
            done();
        }
    },
});

/**
 * Interceptor responsible for responding to a CANCEL_FILE_DOWNLOAD action and cancelling
 * the corresponding download request (including deleting the partially downloaded artifact, if any)
 */
const cancelFileDownloadLogic = createLogic({
    type: CANCEL_FILE_DOWNLOAD,
    process(deps: ReduxLogicDeps, dispatch, done) {
        const action = deps.action as CancelFileDownloadAction;
        const { fileDownloadService } = interactionSelectors.getPlatformDependentServices(
            deps.getState()
        );
        try {
            fileDownloadService.cancelActiveRequest(action.payload.downloadProcessId);
            dispatch(removeStatus(action.payload.downloadProcessId));
        } catch (err) {
            dispatch(
                processFailure(
                    action.payload.downloadProcessId,
                    `Something went wrong cleaning up cancelled download. Details: ${
                        err instanceof Error ? err.message : err
                    }`
                )
            );
        } finally {
            done();
        }
    },
});

/**
 * Interceptor responsible for responding to a DOWNLOAD_FILES action and
 * initiating the downloads of the files, showing notifications of process status along the way.
 */
const downloadFiles = createLogic({
    type: DOWNLOAD_FILES,
    warnTimeout: 0, // no way to know how long this will take--don't print console warning if it takes a while
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const fileSelection = selection.selectors.getFileSelection(deps.getState());
        const { fileDownloadService } = interactionSelectors.getPlatformDependentServices(
            deps.getState()
        );

        const numberFormatter = annotationFormatterFactory(AnnotationType.NUMBER);
        const {
            payload: { files, shouldPromptForDownloadDirectory },
        } = deps.action as DownloadFilesAction;
        const destination = shouldPromptForDownloadDirectory
            ? await fileDownloadService.promptForDownloadDirectory()
            : await fileDownloadService.getDefaultDownloadDirectory();

        if (destination !== FileDownloadCancellationToken) {
            let filesToDownload: FileDetail[];
            if (files !== undefined) {
                filesToDownload = files;
            } else {
                filesToDownload = await fileSelection.fetchAllDetails();
            }

            const totalBytesToDownload = sumBy(filesToDownload, "size");
            const totalBytesDisplay = numberFormatter.displayValue(totalBytesToDownload, "bytes");
            await Promise.all(
                filesToDownload.map(async (file) => {
                    const downloadRequestId = uniqueId();
                    // TODO: The byte display should be fixed automatically when moving to downloading using browser
                    // https://github.com/AllenInstitute/aics-fms-file-explorer-app/issues/62
                    const fileByteDisplay = numberFormatter.displayValue(file.size || 0, "bytes");
                    const msg = `Downloading ${file.name}, ${fileByteDisplay} out of the total of ${totalBytesDisplay} set to download`;

                    const onCancel = () => {
                        dispatch(cancelFileDownload(downloadRequestId));
                    };

                    let totalBytesDownloaded = 0;
                    // A function that dispatches progress events, throttled
                    // to only be invokable at most once/second
                    const throttledProgressDispatcher = throttle(() => {
                        dispatch(
                            processProgress(
                                downloadRequestId,
                                file.size ? totalBytesDownloaded / file.size : 0,
                                msg,
                                onCancel,
                                [file.id]
                            )
                        );
                    }, 1000);
                    const onProgress = (transferredBytes: number) => {
                        totalBytesDownloaded += transferredBytes;
                        throttledProgressDispatcher();
                    };

                    try {
                        dispatch(processStart(downloadRequestId, msg, onCancel, [file.id]));

                        const result = await fileDownloadService.downloadFile(
                            {
                                id: file.id,
                                name: file.name,
                                path: file.path,
                                size: file.size,
                            },
                            destination,
                            downloadRequestId,
                            onProgress
                        );

                        if (result.resolution === DownloadResolution.CANCELLED) {
                            // Clear status if request was cancelled
                            dispatch(removeStatus(downloadRequestId));
                        } else {
                            dispatch(processSuccess(downloadRequestId, result.msg || ""));
                        }
                    } catch (err) {
                        const errorMsg = `File download failed for file ${
                            file.name
                        }. Details:<br/>${err instanceof Error ? err.message : err}`;
                        dispatch(processFailure(downloadRequestId, errorMsg));
                    }
                })
            );
        }

        done();
    },
});

const SYSTEM_DEFAULT_APP: UserSelectedApplication = Object.freeze({
    defaultFileKinds: [],
    filePath: SystemDefaultAppLocation,
});

const openWithDefault = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const {
            payload: { files, filters },
        } = deps.action as OpenWithDefaultAction;
        const fileService = interactionSelectors.getFileService(deps.getState());
        const fileSelection = selection.selectors.getFileSelection(deps.getState());
        const sortColumn = selection.selectors.getSortColumn(deps.getState());
        const userSelectedApplications =
            interactionSelectors.getUserSelectedApplications(deps.getState()) || [];

        // Collect file information from either the folder filter or the file selection
        let filesToOpen;
        if (files) {
            filesToOpen = files;
        } else if (filters) {
            const fileSet = new FileSet({
                filters,
                fileService,
                sort: sortColumn,
            });
            const totalFileCount = await fileSet.fetchTotalCount();
            filesToOpen = await fileSet.fetchFileRange(0, totalFileCount);
        } else {
            filesToOpen = await fileSelection.fetchAllDetails();
        }

        // Map file kinds to their default applications
        const kindToApp = userSelectedApplications.reduce(
            (kindToAppMap, app) =>
                app.defaultFileKinds.reduce(
                    (map, kind) => ({
                        ...map,
                        [kind]: app,
                    }),
                    kindToAppMap
                ),
            {} as { [kind: string]: UserSelectedApplication }
        );

        // Map apps to the files they are meant to open
        const appToFiles = filesToOpen.reduce((appToFilesMap, file) => {
            const kinds =
                (file.annotations.find((a) => a.name === AnnotationName.KIND)
                    ?.values as string[]) || [];
            const kind = kinds.length ? kinds[0] : "SYSTEM_DEFAULT";
            const app = kindToApp[kind] || SYSTEM_DEFAULT_APP;
            return {
                ...appToFilesMap,
                [app.filePath]: [...(appToFilesMap[app.filePath] || []), file],
            };
        }, {} as { [appFilePath: string]: FileDetail[] });

        // Dispatch openWith events for the files grouped by app
        Object.entries(appToFiles).forEach(([appFilePath, files]) => {
            const app =
                userSelectedApplications.find((a) => a.filePath === appFilePath) ||
                SYSTEM_DEFAULT_APP;
            dispatch(openWith(app, filters, files));
        });
        done();
    },
    type: OPEN_WITH_DEFAULT,
});

const openWithLogic = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const fileService = interactionSelectors.getFileService(deps.getState());
        const fileSelection = selection.selectors.getFileSelection(deps.getState());
        const {
            fileViewerService,
            executionEnvService,
        } = interactionSelectors.getPlatformDependentServices(deps.getState());
        const sortColumn = selection.selectors.getSortColumn(deps.getState());
        const {
            payload: {
                files,
                filters,
                app: { filePath: exePath },
            },
        } = deps.action as OpenWithAction;

        // Gather up the file paths for the files selected currently
        let filesToOpen;
        if (files) {
            filesToOpen = files;
        } else if (filters) {
            const fileSet = new FileSet({
                filters,
                fileService,
                sort: sortColumn,
            });
            const totalFileCount = await fileSet.fetchTotalCount();
            filesToOpen = await fileSet.fetchFileRange(0, totalFileCount);
        } else {
            filesToOpen = await fileSelection.fetchAllDetails();
        }
        const filePaths = await Promise.all(
            filesToOpen.map((file) => executionEnvService.formatPathForHost(file.path))
        );

        // Open the files in the specified executable
        await fileViewerService.open(exePath, filePaths);

        done();
    },
    type: OPEN_WITH,
});

const browseForNewDataSource = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { executionEnvService } = interactionSelectors.getPlatformDependentServices(
            deps.getState()
        );

        const filePath = await executionEnvService.promptForFile(["csv", "parquet", "json"]);
        if (filePath !== ExecutableEnvCancellationToken) {
            const dataSourceName = await executionEnvService.getFilename(filePath);
            dispatch(
                selection.actions.addQuery({
                    name: `New ${dataSourceName} Query`,
                    url: FileExplorerURL.encode({
                        collection: { name: dataSourceName, uri: filePath, version: 1 },
                    }),
                })
            );
        }

        done();
    },
    type: BROWSE_FOR_NEW_DATA_SOURCE,
});

/**
 * Interceptor responsible for responding to a SHOW_CONTEXT_MENU action and ensuring the previous
 * context menu is dismissed gracefully.
 */
const showContextMenu = createLogic({
    type: SHOW_CONTEXT_MENU,
    async transform(deps: ReduxLogicDeps, next) {
        const { action, getState } = deps;
        // In some cases (like if the context menu was re-triggered to appear somewhere else)
        // there is no automatic call to dismiss the menu, in which case we need to manually trigger this
        const existingDismissAction = interactionSelectors.getContextMenuOnDismiss(getState());
        if (existingDismissAction) {
            existingDismissAction();
        }
        next(action);
    },
});

/**
 * Interceptor responsible for processing REFRESH actions into individual
 * actions meant to update the directory tree and annotation hierarchy
 */
const refresh = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        try {
            const { getState } = deps;
            const annotationService = interactionSelectors.getAnnotationService(getState());

            // Refresh list of annotations & which annotations are available
            const hierarchy = selection.selectors.getAnnotationHierarchy(getState());
            const [annotations, availableAnnotations] = await Promise.all([
                annotationService.fetchAnnotations(),
                annotationService.fetchAvailableAnnotationsForHierarchy(hierarchy),
            ]);
            dispatch(metadata.actions.receiveAnnotations(annotations));
            dispatch(selection.actions.setAvailableAnnotations(availableAnnotations));
        } catch (e) {
            console.error("Error encountered while refreshing");
            const annotations = metadata.selectors.getAnnotations(deps.getState());
            dispatch(selection.actions.setAvailableAnnotations(annotations.map((a) => a.name)));
        } finally {
            done();
        }
    },
    type: REFRESH,
});

export default [
    checkForUpdates,
    downloadManifest,
    cancelFileDownloadLogic,
    browseForNewDataSource,
    openWithDefault,
    openWithLogic,
    downloadFiles,
    showContextMenu,
    refresh,
];
