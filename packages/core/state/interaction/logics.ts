import { isEmpty, uniqueId } from "lodash";
import { createLogic } from "redux-logic";

import { metadata, ReduxLogicDeps, selection } from "../";
import {
    DOWNLOAD_MANIFEST,
    DownloadManifestAction,
    succeedManifestDownload,
    failManifestDownload,
    removeStatus,
    startManifestDownload,
    SHOW_CONTEXT_MENU,
    CANCEL_MANIFEST_DOWNLOAD,
    cancelManifestDownload,
    setAllenMountPoint,
    setCsvColumns,
    GENERATE_PYTHON_SNIPPET,
    GeneratePythonSnippetAction,
    startPythonSnippetGeneration,
    succeedPythonSnippetGeneration,
    failPythonSnippetGeneration,
    REFRESH,
    SET_PLATFORM_DEPENDENT_SERVICES,
    promptUserToUpdateApp,
    OPEN_FILES_WITH_APPLICATION,
} from "./actions";
import * as interactionActions from "./actions";
import * as interactionSelectors from "./selectors";
import CsvService from "../../services/CsvService";
import { CancellationToken } from "../../services/FileDownloadService";
import FileSet from "../../entity/FileSet";
import NumericRange from "../../entity/NumericRange";
import { CreateDatasetRequest } from "../../services/DatasetService";
import { SelectionRequest, Selection } from "../../services/FileService";
import { ExecutableEnvCancellationToken } from "../../services/ExecutionEnvService";

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
                dispatch(cancelManifestDownload(manifestDownloadProcessId));
            };
            dispatch(
                startManifestDownload(
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
            dispatch(succeedManifestDownload(manifestDownloadProcessId, successMsg));
        } catch (err) {
            const errorMsg = `Download of CSV manifest failed.<br/>${err}`;
            dispatch(failManifestDownload(manifestDownloadProcessId, errorMsg));
        } finally {
            dispatch(setCsvColumns(annotations.map((annotation) => annotation.displayName)));
            done();
        }
    },
});

/**
 * Interceptor responsible for responding to a CANCEL_MANIFEST_DOWNLOAD action and cancelling
 * the corresponding manifest download request (including deleting the potential artifact)
 */
const cancelManifestDownloadLogic = createLogic({
    type: CANCEL_MANIFEST_DOWNLOAD,
    async transform(deps: ReduxLogicDeps, next, reject) {
        const { action, getState } = deps;
        const { fileDownloadService } = interactionSelectors.getPlatformDependentServices(
            getState()
        );
        try {
            await fileDownloadService.cancelActiveRequest(action.payload.id);
            reject && reject(action);
        } catch (err) {
            next(
                failManifestDownload(
                    action.payload.id,
                    "Something went wrong cleaning up cancelled download."
                )
            );
        }
    },
});

const openFilesWithApplication = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const fileSelection = selection.selectors.getFileSelection(deps.getState());
        const savedAllenMountPoint = interactionSelectors.getAllenMountPoint(deps.getState());
        const {
            fileViewerService,
            executionEnvService,
        } = interactionSelectors.getPlatformDependentServices(deps.getState());
        const userSelectedApplications = interactionSelectors.getKnownApplications(deps.getState());

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
            let { filePath: executableLocation } = deps.action.payload;
            const isValidExecutableLocation = await executionEnvService.isValidExecutable(
                executableLocation
            );
            if (!isValidExecutableLocation) {
                const { name } = deps.action.payload;
                executableLocation = await executionEnvService.promptForExecutable(
                    `${name} Executable`,
                    `It appears that your ${name} application isn't located where we thought it would be. ` +
                        `Select your ${name} application now?`
                );
                // Save the executable location for future use if new
                if (executableLocation !== ExecutableEnvCancellationToken) {
                    const updatedApps = (userSelectedApplications || []).map((app) => ({
                        ...app,
                        filePath: app.name === name ? executableLocation : app.filePath,
                    }));
                    dispatch(interactionActions.setUserSelectedApplication(updatedApps));
                }
            }

            // If the user did not cancel out of a prompt, continue trying to open the executable
            if (executableLocation !== ExecutableEnvCancellationToken) {
                // Gather up the file paths for the files selected currently
                const selectedFilesDetails = await fileSelection.fetchAllDetails();
                const filePaths = selectedFilesDetails.map((file) =>
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
    type: OPEN_FILES_WITH_APPLICATION,
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
            dispatch(startPythonSnippetGeneration(generatePythonSnippetProcessId));
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
                failPythonSnippetGeneration(
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
    cancelManifestDownloadLogic,
    openFilesWithApplication,
    showContextMenu,
    generatePythonSnippet,
    refresh,
];
