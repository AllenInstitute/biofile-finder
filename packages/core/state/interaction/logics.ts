import { chunk, isEmpty, noop, sumBy, throttle, uniq, uniqueId } from "lodash";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";

import { metadata, ReduxLogicDeps, selection } from "../";
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
    EDIT_FILES,
    EditFiles,
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
import FileExplorerURL, { DEFAULT_AICS_FMS_QUERY } from "../../entity/FileExplorerURL";
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
                    parts: FileExplorerURL.decode(window.location.search),
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
                path: file.downloadPath,
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
            filesToOpen.map((file) => executionEnvService.formatPathForHost(file.path))
        );

        // Open the files in the specified executable
        await fileViewerService.open(exePath, filePaths);

        done();
    },
    type: OPEN_WITH,
});

/**
 * Interceptor responsible for translating an EDIT_FILES action into a progress tracked
 * series of edits on the files currently selected.
 */
const editFilesLogic = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const fileService = interactionSelectors.getFileService(deps.getState());
        const fileSelection = selection.selectors.getFileSelection(deps.getState());
        const sortColumn = selection.selectors.getSortColumn(deps.getState());
        const annotationNameToAnnotationMap = metadata.selectors.getAnnotationNameToAnnotationMap(
            deps.getState()
        );
        const {
            payload: { annotations, filters },
        } = deps.action as EditFiles;

        // Gather up the files for the files selected currently
        // if filters is present then actual "selected" files
        // are the ones that match the filters, this happens when
        // editing a whole folder for example
        let filesSelected;
        if (filters) {
            const fileSet = new FileSet({
                filters,
                fileService,
                sort: sortColumn,
            });
            const totalFileCount = await fileSet.fetchTotalCount();
            filesSelected = await fileSet.fetchFileRange(0, totalFileCount);
        } else {
            filesSelected = await fileSelection.fetchAllDetails();
        }

        // Break files into batches of 10 File IDs
        const fileIds = filesSelected.map((file) => file.uid);
        const batches = chunk(fileIds, 10);

        // Dispatch an event to alert the user of the start of the process
        const editRequestId = uniqueId();
        const editProcessMsg = "Editing files in progress.";
        dispatch(processStart(editRequestId, editProcessMsg, noop));

        // Track the total number of files edited
        let totalFileEdited = 0;

        // Throttled progress dispatcher
        const onProgress = throttle(() => {
            dispatch(
                processProgress(
                    editRequestId,
                    totalFileEdited / fileIds.length,
                    editProcessMsg,
                    noop
                )
            );
        }, 1000);

        try {
            // Begin editing files in batches
            for (const batch of batches) {
                // Asynchronously begin the edit for each file in the batch
                const promises = batch.map(
                    (fileId) =>
                        new Promise<void>(async (resolve, reject) => {
                            try {
                                await fileService.editFile(
                                    fileId,
                                    annotations,
                                    annotationNameToAnnotationMap
                                );
                                totalFileEdited += 1;
                                onProgress();
                                resolve();
                            } catch (err) {
                                reject(err);
                            }
                        })
                );

                // Await the results of this batch
                await Promise.all(promises);
            }
            dispatch(refresh); // Sync state to pull updated files
            dispatch(processSuccess(editRequestId, "Successfully edited files."));
        } catch (err) {
            // Dispatch an event to alert the user of the failure
            const errorMsg = `Failed to finish editing files, some may have been edited. Details:<br/>${
                err instanceof Error ? err.message : err
            }`;
            dispatch(processError(editRequestId, errorMsg));
        } finally {
            done();
        }
    },
    type: EDIT_FILES,
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

export default [
    initializeApp,
    downloadManifest,
    editFilesLogic,
    cancelFileDownloadLogic,
    promptForNewExecutable,
    openWithDefault,
    openWithLogic,
    downloadFilesLogic,
    showContextMenu,
    refresh,
    setIsSmallScreen,
];
