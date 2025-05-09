import { isEmpty, sumBy, throttle, uniq, uniqueId } from "lodash";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";

import { interaction, metadata, ReduxLogicDeps, selection } from "../";
import {
    DOWNLOAD_MANIFEST,
    DownloadManifestAction,
    processSuccess,
    processError,
    removeStatus,
    processStart,
    SHOW_CONTEXT_MENU,
    CANCEL_FILE_DOWNLOAD,
    cancelFileDownload,
    CancelFileDownloadAction,
    REFRESH,
    OPEN_WITH,
    openWith,
    OpenWithAction,
    OPEN_WITH_DEFAULT,
    processProgress,
    DOWNLOAD_FILES,
    DownloadFilesAction,
    OpenWithDefaultAction,
    PROMPT_FOR_NEW_EXECUTABLE,
    setUserSelectedApplication,
    INITIALIZE_APP,
    setIsAicsEmployee,
    SET_IS_SMALL_SCREEN,
    SetIsSmallScreenAction,
    setVisibleModal,
    hideVisibleModal,
    CopyFilesAction,
    COPY_FILES,
} from "./actions";
import * as interactionSelectors from "./selectors";
import { DownloadResolution, FileInfo } from "../../services/FileDownloadService";
import annotationFormatterFactory, { AnnotationType } from "../../entity/AnnotationFormatter";
import FileSet from "../../entity/FileSet";
import {
    ExecutableEnvCancellationToken,
    SystemDefaultAppLocation,
} from "../../services/ExecutionEnvService";
import { UserSelectedApplication } from "../../services/PersistentConfigService";
import FileDetail from "../../entity/FileDetail";
import AnnotationName from "../../entity/Annotation/AnnotationName";
import FileSelection from "../../entity/FileSelection";
import NumericRange from "../../entity/NumericRange";
import SearchParams, { DEFAULT_AICS_FMS_QUERY } from "../../entity/SearchParams";
import { ModalType } from "../../components/Modal";

export const DEFAULT_QUERY_NAME = "New Query";

/**
 * Interceptor responsible for checking if the user is able to access the AICS network
 */
const initializeApp = createLogic({
    type: INITIALIZE_APP,
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const queries = selection.selectors.getQueries(deps.getState());
        const isOnWeb = interactionSelectors.isOnWeb(deps.getState());
        const fileService = interactionSelectors.getHttpFileService(deps.getState());

        // Redimentary check to see if the user is an AICS Employee by
        // checking if the AICS network is accessible
        const isAicsEmployee = await fileService.isNetworkAccessible();

        // If there are query args representing a query we can extract that
        // into the query to render (ex. when refreshing a page)
        if (isOnWeb && window.location.search) {
            dispatch(
                selection.actions.addQuery({
                    name: DEFAULT_QUERY_NAME,
                    parts: SearchParams.decode(window.location.search),
                })
            );
        } else if (queries.length) {
            dispatch(selection.actions.changeQuery(queries[0]));
        } else if (isAicsEmployee) {
            dispatch(
                selection.actions.addQuery({
                    name: "New AICS FMS Query",
                    parts: DEFAULT_AICS_FMS_QUERY,
                })
            );
        }

        dispatch(setIsAicsEmployee(isAicsEmployee) as AnyAction);
        done();
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
            payload: { annotations, type },
        } = deps.action as DownloadManifestAction;
        const manifestDownloadProcessId = uniqueId();
        const sortColumn = selection.selectors.getSortColumn(deps.getState());
        const fileService = interactionSelectors.getFileService(deps.getState());
        let fileSelection = selection.selectors.getFileSelection(deps.getState());
        const filters = interactionSelectors.getFileFiltersForVisibleModal(deps.getState());

        // If we have a specific path to get files from ignore selected files
        // or if no selections, assume downloading full result
        if (filters.length || (filters.length === 0 && fileSelection.count() === 0)) {
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

        // if still empty result set, do nothing
        if (isEmpty(selections)) {
            done();
            return;
        }

        const onManifestDownloadCancel = () => {
            dispatch(cancelFileDownload(manifestDownloadProcessId));
        };
        dispatch(
            processStart(
                manifestDownloadProcessId,
                "Download of metadata manifest in progress.",
                onManifestDownloadCancel
            )
        );

        try {
            const result = await fileService.download(annotations, selections, type);

            if (result.resolution === DownloadResolution.CANCELLED) {
                dispatch(removeStatus(manifestDownloadProcessId));
            } else {
                const successMsg = `Download of metadata manifest finished.<br/>${
                    result.msg || ""
                }`;
                dispatch(processSuccess(manifestDownloadProcessId, successMsg));
            }
        } catch (err) {
            const errorMsg = `Download of metadata manifest failed. Details: ${
                err instanceof Error ? err.message : err
            }`;
            dispatch(processError(manifestDownloadProcessId, errorMsg));
        }

        done();
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
                processError(
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
const downloadFilesLogic = createLogic({
    type: DOWNLOAD_FILES,
    warnTimeout: 0, // no way to know how long this will take--don't print console warning if it takes a while
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const fileSelection = selection.selectors.getFileSelection(deps.getState());
        const { fileDownloadService } = interactionSelectors.getPlatformDependentServices(
            deps.getState()
        );

        const numberFormatter = annotationFormatterFactory(AnnotationType.NUMBER);
        const { payload: files } = deps.action as DownloadFilesAction;

        let filesToDownload: FileInfo[];
        if (files !== undefined) {
            filesToDownload = files;
        } else {
            const selectedFilesDetails = await fileSelection.fetchAllDetails();
            filesToDownload = selectedFilesDetails.map((file) => ({
                id: file.uid,
                name: file.name,
                size: file.size,
                path: fileDownloadService.isFileSystemAccessible
                    ? ((file.getFirstAnnotationValue(AnnotationName.LOCAL_FILE_PATH) ||
                          file.path) as string)
                    : file.path,
            }));
        }

        await Promise.all(
            filesToDownload.map(async (file) => {
                // Handle S3 zarr files
                if (file.path.includes("amazonaws.com") && file.path.endsWith(".zarr")) {
                    try {
                        const { hostname, key } = fileDownloadService.parseS3Url(file.path);
                        file.size = await fileDownloadService.calculateS3DirectorySize(
                            hostname,
                            key
                        );
                    } catch (err) {
                        console.error(
                            `Failed to calculate directory size for ${file.name}: ${err}`
                        );
                    }
                } else if (file.size === 0 && file.path.includes("amazonaws.com")) {
                    // Handle individual S3 files
                    try {
                        const s3HeadResponse = await fileDownloadService.headS3Object(file.path);
                        file.size = s3HeadResponse.size;
                    } catch (err) {
                        console.error(`Failed to fetch file size for ${file.name}: ${err}`);
                    }
                }
            })
        );

        // Calculate total bytes to download
        const totalBytesToDownload = sumBy(filesToDownload, "size") || 0;
        const totalBytesDisplay = numberFormatter.displayValue(totalBytesToDownload, "bytes");

        await Promise.all(
            filesToDownload.map(async (file) => {
                const downloadRequestId = uniqueId();
                // TODO: The byte display should be fixed automatically when moving to downloading using browser
                // https://github.com/AllenInstitute/biofile-finder/issues/62
                const fileByteDisplay = numberFormatter.displayValue(file.size || 0, "bytes");

                let totalBytesDownloaded = 0;
                // A function that dispatches progress events, throttled
                // to only be invokable at most once/second
                const onCancel = () => {
                    dispatch(cancelFileDownload(downloadRequestId));
                };

                // Throttled progress dispatcher with updated message
                const throttledProgressDispatcher = throttle((progressMsg: string) => {
                    dispatch(
                        processProgress(
                            downloadRequestId,
                            totalBytesToDownload ? totalBytesDownloaded / totalBytesToDownload : 0,
                            progressMsg,
                            onCancel,
                            [file.id]
                        )
                    );
                }, 1000);

                const onProgress = (transferredBytes: number) => {
                    totalBytesDownloaded += transferredBytes;

                    // Generate new message
                    const updatedBytesDisplay = numberFormatter.displayValue(
                        totalBytesDownloaded,
                        "bytes"
                    );
                    const progressMsg = `Downloading ${file.name}. <br/> ${updatedBytesDisplay} out of ${totalBytesDisplay} set to download`;
                    throttledProgressDispatcher(progressMsg);
                };

                try {
                    // Start the download and handle progress reporting
                    const msg = `Downloading ${file.name}. <br/> ${fileByteDisplay} out of ${totalBytesDisplay} set to download`;
                    if (totalBytesToDownload) {
                        dispatch(processStart(downloadRequestId, msg, onCancel, [file.id]));
                    }

                    const result = await fileDownloadService.download(
                        file,
                        downloadRequestId,
                        onProgress
                    );

                    if (totalBytesToDownload) {
                        if (result.resolution === DownloadResolution.CANCELLED) {
                            dispatch(removeStatus(downloadRequestId));
                        } else {
                            dispatch(
                                processSuccess(
                                    downloadRequestId,
                                    result.msg || "Download completed successfully."
                                )
                            );
                        }
                    }
                } catch (err) {
                    const errorMsg = `File download failed for file ${file.name}. Details:<br/>${
                        err instanceof Error ? err.message : err
                    }`;
                    dispatch(processError(downloadRequestId, errorMsg));
                }
            })
        );

        done();
    },
});

const promptForNewExecutable = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const {
            executionEnvService,
            notificationService,
        } = interactionSelectors.getPlatformDependentServices(deps.getState());
        const fileSelection = selection.selectors.getFileSelection(deps.getState());
        const userSelectedApplications = interactionSelectors.getUserSelectedApplications(
            deps.getState()
        );

        const executableLocation = await executionEnvService.promptForExecutable(
            "Select Application to Open Selected Files With"
        );

        // Continue unless the user cancelled the prompt
        if (executableLocation !== ExecutableEnvCancellationToken) {
            // Determine the kinds of files currently selected
            const selectedFilesDetails = await fileSelection.fetchAllDetails();
            const fileKinds = uniq(
                selectedFilesDetails.flatMap(
                    (file) =>
                        file.annotations.find((a) => a.name === AnnotationName.KIND)
                            ?.values as string[]
                )
            );

            // Ask whether this app should be the default for
            // the file kinds selected
            const filename = await executionEnvService.getFilename(executableLocation);
            const shouldSetAsDefault = await notificationService.showQuestion(
                `${filename}`,
                `Set ${filename} as the default for ${fileKinds} files?`
            );
            const defaultFileKinds = shouldSetAsDefault ? fileKinds : [];

            // Update previously saved apps if necessary & add this one
            const newApp = { filePath: executableLocation, defaultFileKinds };
            const existingApps = (userSelectedApplications || [])
                .filter((app) => app.filePath !== executableLocation)
                .map((app) => ({
                    ...app,
                    defaultFileKinds: app.defaultFileKinds.filter(
                        (kind: string) => !defaultFileKinds.includes(kind)
                    ),
                }));
            const apps = [...existingApps, newApp];

            // Save app configuration & open files in new app
            dispatch(setUserSelectedApplication(apps));
            dispatch(openWith(newApp, deps.action.payload));
        }
        done();
    },
    type: PROMPT_FOR_NEW_EXECUTABLE,
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
            // Default to local path for desktop apps
            filesToOpen.map((file) => {
                const filePath =
                    file.getFirstAnnotationValue(AnnotationName.LOCAL_FILE_PATH) ?? file.path;
                return executionEnvService.formatPathForHost(filePath as string);
            })
        );

        // Open the files in the specified executable
        await fileViewerService.open(exePath, filePaths);

        done();
    },
    type: OPEN_WITH,
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
            const hierarchy = selection.selectors.getAnnotationHierarchy(getState());
            const annotationService = interactionSelectors.getAnnotationService(getState());

            // Refresh list of annotations & which annotations are available
            const [annotations, availableAnnotations] = await Promise.all([
                annotationService.fetchAnnotations(),
                annotationService.fetchAvailableAnnotationsForHierarchy(hierarchy),
            ]);
            dispatch(metadata.actions.receiveAnnotations(annotations));
            dispatch(selection.actions.setAvailableAnnotations(availableAnnotations));
        } catch (err) {
            console.error(`Error encountered while refreshing: ${err}`);
            const annotations = metadata.selectors.getAnnotations(deps.getState());
            dispatch(selection.actions.setAvailableAnnotations(annotations.map((a) => a.name)));
        } finally {
            done();
        }
    },
    type: REFRESH,
});

/**
 * Interceptor responsible for processing screen size changes and
 * dispatching appropriate modal changes
 */
const setIsSmallScreen = createLogic({
    process(deps: ReduxLogicDeps, dispatch, done) {
        const { payload: isSmallScreen } = deps.action as SetIsSmallScreenAction;
        const isDisplayingSmallScreenModal = interactionSelectors.getIsDisplayingSmallScreenWarning(
            deps.getState()
        );
        const hasDismissedSmallScreenWarning = interactionSelectors.getHasDismissedSmallScreenWarning(
            deps.getState()
        );

        if (
            isSmallScreen &&
            !isDisplayingSmallScreenModal && // Avoid re-dispatching if already open
            !hasDismissedSmallScreenWarning // User has selected not to show again
        ) {
            dispatch(setVisibleModal(ModalType.SmallScreenWarning));
        } else if (!isSmallScreen && isDisplayingSmallScreenModal) {
            // Don't dispatch hide if a different modal is open
            dispatch(hideVisibleModal());
        }
        done();
    },
    type: SET_IS_SMALL_SCREEN,
});

/**
 * Interceptor responsible for handling the COPY_FILES action.
 * Logs details of files that are being copied to cache.
 */
const copyFilesLogic = createLogic({
    async process({ action, getState }: ReduxLogicDeps, dispatch, done) {
        try {
            const httpFileService = interactionSelectors.getHttpFileService(getState());
            const username = interactionSelectors.getUserName(getState());

            const fileDetails = (action as CopyFilesAction).payload.fileDetails;

            // Map file IDs to file names for easy lookup
            const fileIdToNameMap = Object.fromEntries(
                fileDetails.map((file) => [file.id, file.name])
            );

            // Extract file IDs
            const fileIds = fileDetails.map((file) => file.id);

            const response = await httpFileService.cacheFiles(fileIds, username);
            const cacheStatuses = response.cacheFileStatuses;

            // Check if the response is empty.
            if (!cacheStatuses || Object.keys(cacheStatuses).length === 0) {
                dispatch(
                    interaction.actions.processError(
                        "moveFilesNoFilesProcessed",
                        "No files were processed. Please check the request or try again."
                    )
                );
                return;
            }

            const newlyCachedFiles: string[] = [];
            const extendedExpirationFiles: string[] = [];
            const failedFiles: string[] = [];

            Object.entries(cacheStatuses).forEach(([fileId, status]) => {
                if (
                    status === "DOWNLOAD_COMPLETE" ||
                    status === "DOWNLOAD_IN_PROGRESS" ||
                    status === "DOWNLOAD_STARTED"
                ) {
                    const file = fileDetails.find((f) => f.id === fileId);
                    const isAlreadyCached = file?.annotations.some(
                        ({ name, values }) =>
                            name === "Should Be in Local Cache" && values[0] === true
                    );
                    (isAlreadyCached ? extendedExpirationFiles : newlyCachedFiles).push(fileId);
                } else {
                    failedFiles.push(fileId);
                }
            });

            // Dispatch files queued for download
            if (newlyCachedFiles.length > 0) {
                const count = newlyCachedFiles.length;
                const fileLabel = count === 1 ? "file was" : "files were";
                dispatch(
                    interaction.actions.processSuccess(
                        "moveFilesSuccess",
                        `${count} ${fileLabel} successfully queued for download to NAS (VAST) from the cloud. 
                        ${
                            count === 1 ? "It will be" : "They will be"
                        } available in the NAS after the download${
                            count === 1 ? " finishes" : "s finish"
                        } asynchronously.`
                    )
                );
            }

            // Dispatch files with extended expiration dates.
            if (extendedExpirationFiles.length > 0) {
                const count = extendedExpirationFiles.length;
                const fileLabel = count === 1 ? "file's" : "files'";
                dispatch(
                    interaction.actions.processSuccess(
                        "extendFilesExpirationSuccess",
                        `${count} ${fileLabel} expiration ${
                            count === 1 ? "date has" : "dates have"
                        } been extended.`
                    )
                );
            }

            // Dispatch individual errors for each failed file.
            failedFiles.forEach((fileId) => {
                const fileName = fileIdToNameMap[fileId] || "Unknown File";
                dispatch(
                    interaction.actions.processError(
                        `moveFileFailure_${fileId}`,
                        `File "${fileName}" failed to cache. Status: ${cacheStatuses[fileId]}`
                    )
                );
            });
        } catch (err) {
            // Service call itself fails
            dispatch(
                interaction.actions.processError(
                    "moveFilesFailure",
                    `Failed to cache files, details: ${(err as Error).message}.`
                )
            );
        } finally {
            done();
        }
    },
    type: COPY_FILES,
});

export default [
    initializeApp,
    downloadManifest,
    cancelFileDownloadLogic,
    promptForNewExecutable,
    openWithDefault,
    openWithLogic,
    downloadFilesLogic,
    showContextMenu,
    refresh,
    setIsSmallScreen,
    copyFilesLogic,
];
