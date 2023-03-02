import * as path from "path";
import { isEmpty, throttle, uniq, uniqueId } from "lodash";
import { createLogic } from "redux-logic";
import { batch } from "react-redux";

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
    GENERATE_PYTHON_SNIPPET,
    succeedPythonSnippetGeneration,
    REFRESH,
    SET_PLATFORM_DEPENDENT_SERVICES,
    promptUserToUpdateApp,
    OPEN_WITH,
    PROMPT_FOR_NEW_EXECUTABLE,
    setUserSelectedApplication,
    openWith,
    OpenWithAction,
    OPEN_WITH_DEFAULT,
    DOWNLOAD_FILE,
    DownloadFileAction,
    processProgress,
    GENERATE_SHAREABLE_FILE_SELECTION_LINK,
    succeedShareableFileSelectionLinkGeneration,
    UPDATE_COLLECTION,
} from "./actions";
import * as interactionSelectors from "./selectors";
import CsvService, { CsvManifestRequest } from "../../services/CsvService";
import { DownloadResolution } from "../../services/FileDownloadService";
import annotationFormatterFactory, { AnnotationType } from "../../entity/AnnotationFormatter";
import FileSet from "../../entity/FileSet";
import NumericRange from "../../entity/NumericRange";
import { CreateDatasetRequest, Dataset } from "../../services/DatasetService";
import { FmsFile } from "../../services/FileService";
import {
    ExecutableEnvCancellationToken,
    SystemDefaultAppLocation,
} from "../../services/ExecutionEnvService";
import { AnnotationName } from "../../constants";
import { UserSelectedApplication } from "../../services/PersistentConfigService";
import FileSelection from "../../entity/FileSelection";
import FileFilter from "../../entity/FileFilter";
import FileExplorerURL from "../../entity/FileExplorerURL";
import FileSort, { SortOrder } from "../../entity/FileSort";
import { HttpServiceBase } from "../../services";

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
            const applicationVersion = interactionSelectors.getApplicationVersion(state);
            const collection = selection.selectors.getCollection(state);
            const baseUrl = interactionSelectors.getFileExplorerServiceBaseUrl(state);
            const platformDependentServices = interactionSelectors.getPlatformDependentServices(
                state
            );
            let fileSelection = selection.selectors.getFileSelection(state);
            const filters = interactionSelectors.getFileFiltersForVisibleModal(state);
            const fileService = interactionSelectors.getFileService(state);
            const sortColumn = selection.selectors.getSortColumn(state);
            const pathSuffix = collection
                ? `/within/${HttpServiceBase.encodeURI(collection.name)}/${collection.version}`
                : undefined;
            const csvService = new CsvService({
                applicationVersion,
                baseUrl,
                pathSuffix,
                downloadService: platformDependentServices.fileDownloadService,
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
            const result = await csvService.downloadCsv(request, manifestDownloadProcessId);

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
 * Interceptor responsible for responding to a DOWNLOAD_FILE action and
 * initiating the download of the correct file, showing notifications of process status along the way.
 */
const downloadFile = createLogic({
    type: DOWNLOAD_FILE,
    warnTimeout: 0, // no way to know how long this will take--don't print console warning if it takes a while
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { payload: fileInfo } = deps.action as DownloadFileAction;
        const downloadRequestId = uniqueId();
        const state = deps.getState();
        const { fileDownloadService } = interactionSelectors.getPlatformDependentServices(state);

        const numberFormatter = annotationFormatterFactory(AnnotationType.NUMBER);
        const msg = `Downloading ${fileInfo.name}, ${numberFormatter.displayValue(
            fileInfo.size,
            "bytes"
        )} in total`;

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
                    totalBytesDownloaded / fileInfo.size,
                    msg,
                    onCancel,
                    [fileInfo.id]
                )
            );
        }, 1000);
        const onProgress = (transferredBytes: number) => {
            totalBytesDownloaded += transferredBytes;
            throttledProgressDispatcher();
        };

        try {
            dispatch(processStart(downloadRequestId, msg, onCancel, [fileInfo.id]));

            const result = await fileDownloadService.downloadFile(
                fileInfo,
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
            const errorMsg = `File download failed. Details:<br/>${
                err instanceof Error ? err.message : err
            }`;
            dispatch(processFailure(downloadRequestId, errorMsg));
        } finally {
            done();
        }
    },
});

/**
 * Interceptor responsible for responding to a DOWNLOAD_FILES action and
 * initiating the downloads of the selected files, showing notifications of process status along the way.
 */
// const downloadSelectedFiles = createLogic({
//     type: DOWNLOAD_SELECTED_FILES,
//     warnTimeout: 0, // no way to know how long this will take--don't print console warning if it takes a while
//     async process(deps: ReduxLogicDeps, dispatch, done) {
//         // TODO: Consider this applying to DOWNLOAD_FILE too like how OPEN_WITH works
//         const fileService = interactionSelectors.getFileService(deps.getState());
//         const fileSelection = selection.selectors.getFileSelection(deps.getState());
//         const {
//             fileDownloadService,
//             executionEnvService,
//         } = interactionSelectors.getPlatformDependentServices(deps.getState());
//         const sortColumn = selection.selectors.getSortColumn(deps.getState());

//         const numberFormatter = annotationFormatterFactory(AnnotationType.NUMBER);

//         let filesToOpen;
//         if (files) {
//             filesToOpen = files;
//         } else if (filters) {
//             const fileSet = new FileSet({
//                 filters,
//                 fileService,
//                 sort: sortColumn,
//             });
//             const totalFileCount = await fileSet.fetchTotalCount();
//             filesToOpen = await fileSet.fetchFileRange(0, totalFileCount);
//         } else {
//             filesToOpen = await fileSelection.fetchAllDetails();
//         }
//         const filePaths = await Promise.all(
//             // TODO: Need this function out of the executation env???
//             filesToOpen.map(
//                 async (file) => await executionEnvService.formatPathForHost(file.file_path)
//             )
//         );

//         filePaths.forEach(filePath => {
//             const downloadRequestId = uniqueId();
//             const msg = `Downloading ${fileInfo.name}, ${numberFormatter.displayValue(
//                 fileInfo.size,
//                 "bytes"
//             )} in total`;

//             const onCancel = () => {
//                 dispatch(cancelFileDownload(downloadRequestId));
//             };

//             let totalBytesDownloaded = 0;
//             // A function that dispatches progress events, throttled
//             // to only be invokable at most once/second
//             const throttledProgressDispatcher = throttle(() => {
//                 dispatch(
//                     processProgress(
//                         downloadRequestId,
//                         totalBytesDownloaded / fileInfo.size,
//                         msg,
//                         onCancel,
//                         [fileInfo.id]
//                     )
//                 );
//             }, 1000);
//             const onProgress = (transferredBytes: number) => {
//                 totalBytesDownloaded += transferredBytes;
//                 throttledProgressDispatcher();
//             };

//             try {
//                 dispatch(processStart(downloadRequestId, msg, onCancel, [fileInfo.id]));

//                 const result = await fileDownloadService.downloadFile(
//                     fileInfo,
//                     downloadRequestId,
//                     onProgress
//                 );

//                 if (result.resolution === DownloadResolution.CANCELLED) {
//                     // Clear status if request was cancelled
//                     dispatch(removeStatus(downloadRequestId));
//                 } else {
//                     dispatch(processSuccess(downloadRequestId, result.msg || ""));
//                 }
//             } catch (err) {
//                 const errorMsg = `File download failed. Details:<br/>${
//                     err instanceof Error ? err.message : err
//                 }`;
//                 dispatch(processFailure(downloadRequestId, errorMsg));
//             }
//         })

//         done();
//     }
// });

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
            const filename = path.basename(executableLocation);
            const shouldSetAsDefault = await notificationService.showQuestion(
                `${filename}`,
                `Set ${filename} as the default for ${fileKinds} files?`
            );
            const defaultFileKinds = shouldSetAsDefault ? fileKinds : [];

            // Update previously saved apps if necessary & add this one
            const newApp = { filePath: executableLocation, defaultFileKinds };
            const existingApps = (userSelectedApplications || [])
                .filter((app) => path.basename(app.filePath) !== filename)
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
        const filters = deps.action.payload;
        const fileService = interactionSelectors.getFileService(deps.getState());
        const fileSelection = selection.selectors.getFileSelection(deps.getState());
        const sortColumn = selection.selectors.getSortColumn(deps.getState());
        const userSelectedApplications =
            interactionSelectors.getUserSelectedApplications(deps.getState()) || [];

        // Collect file information from either the folder filter or the file selection
        let files;
        if (!filters) {
            files = await fileSelection.fetchAllDetails();
        } else {
            const fileSet = new FileSet({
                filters,
                fileService,
                sort: sortColumn,
            });
            const totalFileCount = await fileSet.fetchTotalCount();
            files = await fileSet.fetchFileRange(0, totalFileCount);
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
        const appToFiles = files.reduce((appToFilesMap, file) => {
            const kinds =
                (file.annotations.find((a) => a.name === AnnotationName.KIND)
                    ?.values as string[]) || [];
            const kind = kinds.length ? kinds[0] : "SYSTEM_DEFAULT";
            const app = kindToApp[kind] || SYSTEM_DEFAULT_APP;
            return {
                ...appToFilesMap,
                [app.filePath]: [...(appToFilesMap[app.filePath] || []), file],
            };
        }, {} as { [appFilePath: string]: FmsFile[] });

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
            filesToOpen.map(
                async (file) => await executionEnvService.formatPathForHost(file.file_path)
            )
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
 * Interceptor responsible for responding to UPDATE_COLLECTION actions
 * and processing them into actual metadata update requests to the backend
 */
const updateCollection = createLogic({
    type: UPDATE_COLLECTION,
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const collection = selection.selectors.getCollection(deps.getState());
        const collections = metadata.selectors.getCollections(deps.getState());
        const datasetService = interactionSelectors.getDatasetService(deps.getState());
        if (collection) {
            try {
                const { name, version } = collection;
                const updatedCollection = await datasetService.updateCollection(
                    name,
                    version,
                    deps.action.payload
                );
                batch(() => {
                    dispatch(selection.actions.changeCollection(updatedCollection));
                    dispatch(
                        metadata.actions.receiveCollections(
                            collections.map((c) =>
                                c.id === updatedCollection.id ? updatedCollection : c
                            )
                        )
                    );
                });
            } catch (err) {
                const errorMsg = `Something went wrong updating the collection. Details:<br/>${
                    err instanceof Error ? err.message : err
                }`;
                dispatch(processFailure(uniqueId(), errorMsg));
            }
        }

        done();
    },
});

/**
 * Interceptor responsible for responding to GENERATE_SHAREABLE_FILE_SELECTION_LINK actions
 * and processing the current file selection into a shareable link that will be copied to
 * the user's clipboard and dispatching SUCCEED_SHAREABLE_FILE_SELECTION_LINK_GENERATION
 */
const generateShareableFileSelectionLink = createLogic({
    type: GENERATE_SHAREABLE_FILE_SELECTION_LINK,
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const state = deps.getState();
        const generateShareableFileSelectionLinkId = uniqueId();
        const filters: FileFilter[] | undefined = deps.action.payload?.filters;

        dispatch(
            processStart(
                generateShareableFileSelectionLinkId,
                "Generation of shareable file selection link is in progress."
            )
        );

        try {
            const user = interactionSelectors.getUserName(state);
            const currentCollection = selection.selectors.getCollection(state);
            const sortColumn = selection.selectors.getSortColumn(state);
            let fileSelection = selection.selectors.getFileSelection(state);
            const datasetService = interactionSelectors.getDatasetService(state);

            const defaultExpiration = new Date();
            defaultExpiration.setDate(defaultExpiration.getDate() + 1);
            const defaultDatasetSettings: Partial<CreateDatasetRequest> = {
                name: `${user} - ${new Date().toDateString()}`,
                expiration: defaultExpiration,
                fixed: false,
                private: true,
            };

            // If we have a specific path to get files from ignore selected files
            if (filters?.length) {
                const fileService = interactionSelectors.getFileService(state);
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

            const request: CreateDatasetRequest = {
                ...defaultDatasetSettings,
                ...(deps.action.payload || {}),
                selections,
            };
            const collection = await datasetService.createDataset(request, currentCollection);

            const url = FileExplorerURL.encode({
                collection,
                sortColumn: new FileSort(AnnotationName.UPLOADED, SortOrder.DESC),
                filters: [],
                openFolders: [],
                hierarchy: [],
            });
            navigator.clipboard.writeText(url);

            batch(() => {
                dispatch(succeedShareableFileSelectionLinkGeneration(collection));
                dispatch(
                    processSuccess(
                        generateShareableFileSelectionLinkId,
                        `Successfully created collection "${collection.name}" and copied shareable link to clipboard.`
                    )
                );
            });
        } catch (err) {
            dispatch(
                processFailure(
                    generateShareableFileSelectionLinkId,
                    `Failed to generate shareable file selection link: ${err}`
                )
            );
        }
        done();
    },
});

/**
 * Interceptor responsible for responding to a GENERATE_PYTHON_SNIPPET action and generating the corresponding
 * python snippet.
 */
const generatePythonSnippet = createLogic({
    type: GENERATE_PYTHON_SNIPPET,
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const generatePythonSnippetProcessId = uniqueId();
        const dataset = deps.action.payload as Dataset;
        const datasetService = interactionSelectors.getDatasetService(deps.getState());
        try {
            const pythonSnippet = await datasetService.getPythonicDataAccessSnippet(
                dataset.name,
                dataset.version
            );
            dispatch(succeedPythonSnippetGeneration(generatePythonSnippetProcessId, pythonSnippet));
        } catch (err) {
            dispatch(
                processFailure(
                    generatePythonSnippetProcessId,
                    `Failed to generate Python snippet: ${err}`
                )
            );
        }
        done();
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
            const annotationNamesInHierachy = hierarchy.map((a) => a.name);
            const [annotations, availableAnnotations] = await Promise.all([
                annotationService.fetchAnnotations(),
                annotationService.fetchAvailableAnnotationsForHierarchy(annotationNamesInHierachy),
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
    openWithDefault,
    openWithLogic,
    promptForNewExecutable,
    downloadFile,
    // downloadSelectedFiles,
    showContextMenu,
    updateCollection,
    generateShareableFileSelectionLink,
    generatePythonSnippet,
    refresh,
];
