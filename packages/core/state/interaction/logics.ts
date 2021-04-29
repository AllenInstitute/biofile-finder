import * as path from "path";
import { isEmpty, uniq, uniqueId } from "lodash";
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
    setAllenMountPoint,
    setCsvColumns,
    GENERATE_PYTHON_SNIPPET,
    GeneratePythonSnippetAction,
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
} from "./actions";
import * as interactionSelectors from "./selectors";
import CsvService from "../../services/CsvService";
import { CancellationToken } from "../../services/FileDownloadService";
import annotationFormatterFactory, { AnnotationType } from "../../entity/AnnotationFormatter";
import FileSet from "../../entity/FileSet";
import NumericRange from "../../entity/NumericRange";
import { CreateDatasetRequest } from "../../services/DatasetService";
import { SelectionRequest, Selection, FmsFile } from "../../services/FileService";
import {
    ExecutableEnvCancellationToken,
    SystemDefaultAppLocation,
} from "../../services/ExecutionEnvService";
import { AnnotationName } from "../../constants";
import { UserSelectedApplication } from "../../services/PersistentConfigService";

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
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const {
            payload: { annotations },
        } = deps.action as DownloadManifestAction;
        const manifestDownloadProcessId = uniqueId();

        try {
            const state = deps.getState();
            const applicationVersion = interactionSelectors.getApplicationVersion(state);
            const baseUrl = interactionSelectors.getFileExplorerServiceBaseUrl(state);
            const platformDependentServices = interactionSelectors.getPlatformDependentServices(
                state
            );
            const filters = interactionSelectors.getFileFiltersForVisibleModal(state);
            const fileService = interactionSelectors.getFileService(state);
            const csvService = new CsvService({
                applicationVersion,
                baseUrl,
                downloadService: platformDependentServices.fileDownloadService,
            });

            let selections: Selection[];

            // If we have a specific path to get files from ignore selected files
            if (filters.length) {
                const fileSet = new FileSet({
                    filters,
                    fileService,
                });
                const count = await fileSet.fetchTotalCount();
                const accumulator: { [index: string]: any } = {};
                const selection: Selection = {
                    filters: fileSet.filters.reduce((accum, filter) => {
                        const existing = accum[filter.name] || [];
                        return {
                            ...accum,
                            [filter.name]: [...existing, filter.value],
                        };
                    }, accumulator),
                    indexRanges: [new NumericRange(0, count - 1).toJSON()],
                };
                selections = [selection];
            } else {
                const fileSelection = selection.selectors.getFileSelection(state);
                selections = fileSelection.toCompactSelectionList();
            }

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

            const selectionRequest: SelectionRequest = {
                annotations: annotations.map((annotation) => annotation.name),
                selections,
            };
            const message = await csvService.downloadCsv(
                selectionRequest,
                manifestDownloadProcessId
            );

            if (message === CancellationToken) {
                dispatch(removeStatus(manifestDownloadProcessId));
                return;
            }

            const successMsg = `Download of CSV manifest successfully finished.<br/>${message}`;
            dispatch(processSuccess(manifestDownloadProcessId, successMsg));
        } catch (err) {
            const errorMsg = `Download of CSV manifest failed.<br/>${err}`;
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
    async transform(deps: ReduxLogicDeps, next, reject) {
        const action = deps.action as CancelFileDownloadAction;
        const { fileDownloadService } = interactionSelectors.getPlatformDependentServices(
            deps.getState()
        );
        try {
            await fileDownloadService.cancelActiveRequest(action.payload.downloadProcessId);
            reject && reject(action);
        } catch (err) {
            next(
                processFailure(
                    action.payload.downloadProcessId,
                    "Something went wrong cleaning up cancelled download."
                )
            );
        }
    },
});

/**
 * TODO
 */
 const downloadFile = createLogic({
    type: DOWNLOAD_FILE,
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const {
            payload: { fileName, filePath, fileSize },
        } = deps.action as DownloadFileAction;
        const downloadRequestId = uniqueId();
        const state = deps.getState();
        const { fileDownloadService } = interactionSelectors.getPlatformDependentServices(state);

        const numberFormatter = annotationFormatterFactory(AnnotationType.NUMBER);
        const msg = `Downloading ${fileName} - ${numberFormatter.displayValue(fileSize, "bytes")}`;
        const onCancel = () => {
            dispatch(cancelFileDownload(downloadRequestId));
        };

        const onProgress = (bytesDownloaded: number) => {
            dispatch(processProgress(downloadRequestId, bytesDownloaded / fileSize, msg, onCancel));
        };

        try {
            dispatch(processStart(downloadRequestId, msg));

            const result = await fileDownloadService.downloadFile(
                filePath,
                downloadRequestId,
                onProgress
            );
            if (result === CancellationToken) {
                dispatch(removeStatus(downloadRequestId));
                return;
            }
            const successMsg = `Downloaded ${fileName}`;
            dispatch(processSuccess(downloadRequestId, successMsg));
        } catch (err) {
            const errorMsg = `File download failed.<br/>${err}`;
            dispatch(processFailure(downloadRequestId, errorMsg));
        } finally {
            done();
        }
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
        const savedAllenMountPoint = interactionSelectors.getAllenMountPoint(deps.getState());
        const {
            fileViewerService,
            executionEnvService,
        } = interactionSelectors.getPlatformDependentServices(deps.getState());
        const userSelectedApplications = interactionSelectors.getUserSelectedApplications(
            deps.getState()
        );

        // Verify that the known Allen mount point is valid, if not prompt for it
        let allenMountPoint = savedAllenMountPoint;
        const isValidAllenDrive =
            allenMountPoint && (await executionEnvService.isValidAllenMountPoint(allenMountPoint));
        if (!isValidAllenDrive) {
            allenMountPoint = await executionEnvService.promptForAllenMountPoint(true);
        }

        // If the user did not cancel out of the allen mount prompt, continue trying to open the executable
        if (allenMountPoint && allenMountPoint !== ExecutableEnvCancellationToken) {
            // Save Allen mount point for future use if new
            if (allenMountPoint !== savedAllenMountPoint) {
                dispatch(setAllenMountPoint(allenMountPoint));
            }

            // Verify that the executable location leads to a valid executable
            const {
                payload: {
                    files,
                    filters,
                    app: { filePath: savedExecutableLocation },
                },
            } = deps.action as OpenWithAction;
            let executableLocation = savedExecutableLocation;
            const isValidExecutableLocation = await executionEnvService.isValidExecutable(
                executableLocation
            );
            if (!isValidExecutableLocation) {
                const name = path.basename(executableLocation);
                executableLocation = await executionEnvService.promptForExecutable(
                    `${name} Executable`,
                    `It appears that your ${name} application isn't located where we thought it would be. ` +
                        `Select your ${name} application now?`
                );
                // Save the executable location for future use if new
                if (executableLocation !== ExecutableEnvCancellationToken) {
                    const updatedApps = (userSelectedApplications || []).map((app) => ({
                        ...app,
                        filePath:
                            app.filePath === savedExecutableLocation
                                ? executableLocation
                                : app.filePath,
                    }));
                    dispatch(setUserSelectedApplication(updatedApps));
                }
            }

            // If the user did not cancel out of a prompt, continue trying to open the executable
            if (executableLocation !== ExecutableEnvCancellationToken) {
                // Gather up the file paths for the files selected currently
                let filesToOpen;
                if (files) {
                    filesToOpen = files;
                } else if (filters) {
                    const fileSet = new FileSet({
                        filters,
                        fileService,
                    });
                    const totalFileCount = await fileSet.fetchTotalCount();
                    filesToOpen = await fileSet.fetchFileRange(0, totalFileCount);
                } else {
                    filesToOpen = await fileSelection.fetchAllDetails();
                }
                const filePaths = filesToOpen.map((file) =>
                    executionEnvService.formatPathForOs(
                        file.file_path.substring("/allen".length),
                        allenMountPoint
                    )
                );

                // Open the files in the specified executable
                await fileViewerService.open(executableLocation, filePaths);
            }
        }
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
 * Interceptor responsible for responding to a GENERATE_PYTHON_SNIPPET action and generating the corresponding
 * python snippet.
 */
const generatePythonSnippet = createLogic({
    type: GENERATE_PYTHON_SNIPPET,
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { action, getState } = deps;
        const {
            payload: { dataset, expiration, annotations },
        } = action as GeneratePythonSnippetAction;
        const generatePythonSnippetProcessId = uniqueId();
        try {
            dispatch(
                processStart(
                    generatePythonSnippetProcessId,
                    "Generation of Python snippet is in progress."
                )
            );
            const datasetService = interactionSelectors.getDatasetService(getState());
            const fileService = interactionSelectors.getFileService(getState());
            const filters = interactionSelectors.getFileFiltersForVisibleModal(getState());

            let selections;
            if (!filters.length) {
                const fileSelection = selection.selectors.getFileSelection(getState());
                selections = fileSelection.toCompactSelectionList();
            } else {
                const fileSet = new FileSet({
                    filters,
                    fileService,
                });
                const count = await fileSet.fetchTotalCount();
                const accumulator: { [index: string]: any } = {};
                const selection: Selection = {
                    filters: fileSet.filters.reduce((accum, filter) => {
                        const existing = accum[filter.name] || [];
                        return {
                            ...accum,
                            [filter.name]: [...existing, filter.value],
                        };
                    }, accumulator),
                    indexRanges: [new NumericRange(0, count - 1).toJSON()],
                };
                selections = [selection];
            }
            const request: CreateDatasetRequest = {
                annotations: annotations.map((annotation) => annotation.name),
                expiration,
                name: dataset,
                selections,
            };

            const { name, version } = await datasetService.createDataset(request);
            const pythonSnippet = await datasetService.getPythonicDataAccessSnippet(name, version);

            dispatch(succeedPythonSnippetGeneration(generatePythonSnippetProcessId, pythonSnippet));
        } catch (err) {
            dispatch(
                processFailure(
                    generatePythonSnippetProcessId,
                    `Failed to generate Python snippet: ${err}`
                )
            );
        }

        dispatch(setCsvColumns(annotations.map((annotation) => annotation.displayName)));
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
    type: [REFRESH],
});

export default [
    checkForUpdates,
    downloadManifest,
    cancelFileDownloadLogic,
    openWithDefault,
    openWithLogic,
    promptForNewExecutable,
    downloadFile,
    showContextMenu,
    generatePythonSnippet,
    refresh,
];
