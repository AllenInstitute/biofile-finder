import { isEmpty, sumBy, throttle, uniq, uniqueId } from "lodash";
import { AnyAction } from "redux";
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
import { AnnotationName } from "../../entity/Annotation";
import FileSelection from "../../entity/FileSelection";
import NumericRange from "../../entity/NumericRange";
import FileExplorerURL, { DEFAULT_AICS_FMS_QUERY } from "../../entity/FileExplorerURL";

/**
 * Interceptor responsible for checking if the user is able to access the AICS network
 */
const checkAicsEmployee = createLogic({
    type: INITIALIZE_APP,
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const queries = selection.selectors.getQueries(deps.getState());
        const isOnWeb = interactionSelectors.isOnWeb(deps.getState());
        const selectedQuery = selection.selectors.getSelectedQuery(deps.getState());
        const fileService = interactionSelectors.getHttpFileService(deps.getState());

        // Redimentary check to see if the user is an AICS Employee by
        // checking if the AICS network is accessible
        const isAicsEmployee = await fileService.isNetworkAccessible();

        // If no query is currently selected attempt to choose one for the user
        if (!selectedQuery) {
            // If there are query args representing a query we can extract that
            // into the query to render (ex. when refreshing a page)
            if (isOnWeb && window.location.search) {
                dispatch(
                    selection.actions.addQuery({
                        name: "New Query",
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
            dispatch(processFailure(manifestDownloadProcessId, errorMsg));
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
                id: file.id,
                name: file.name,
                size: file.size,
                path: file.downloadPath,
            }));
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
                            // Clear status if request was cancelled
                            dispatch(removeStatus(downloadRequestId));
                        } else {
                            dispatch(processSuccess(downloadRequestId, result.msg || ""));
                        }
                    }
                } catch (err) {
                    const errorMsg = `File download failed for file ${file.name}. Details:<br/>${
                        err instanceof Error ? err.message : err
                    }`;
                    dispatch(processFailure(downloadRequestId, errorMsg));
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

export default [
    checkAicsEmployee,
    downloadManifest,
    cancelFileDownloadLogic,
    promptForNewExecutable,
    openWithDefault,
    openWithLogic,
    downloadFilesLogic,
    showContextMenu,
    refresh,
];
