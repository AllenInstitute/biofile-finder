import * as fs from "fs";
import * as os from "os";

import { isEmpty, uniqueId } from "lodash";
import { createLogic } from "redux-logic";

import { ReduxLogicDeps, selection } from "../";
import {
    DOWNLOAD_MANIFEST,
    succeedManifestDownload,
    failManifestDownload,
    removeStatus,
    startManifestDownload,
    SHOW_CONTEXT_MENU,
    CANCEL_MANIFEST_DOWNLOAD,
    cancelManifestDownload,
    OPEN_FILES_IN_IMAGE_J
} from "./actions";
import * as interactionSelectors from "./selectors";
import CsvService from "../../services/CsvService";
import { CancellationToken } from "../../services/FileDownloadService";
import NumericRange from "../../entity/NumericRange";
import { defaultFileSetFactory } from "../../entity/FileSet/FileSetFactory";
import FileSet from "../../entity/FileSet";
import { FmsFile } from "../../services/FileService";
import { PersistedDataKeys, PersistentConfigCancellationToken } from "../../services/PersistentConfigService";

const spawn = require("child_process").spawn;

/**
 * Interceptor responsible for responding to a DOWNLOAD_MANIFEST action and triggering a manifest download.
 */
const downloadManifest = createLogic({
    type: DOWNLOAD_MANIFEST,
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { action, getState } = deps;
        const manifestDownloadProcessId = uniqueId();

        try {
            const state = getState();
            const baseUrl = interactionSelectors.getFileExplorerServiceBaseUrl(state);
            const platformDependentServices = interactionSelectors.getPlatformDependentServices(
                state
            );
            const fileService = interactionSelectors.getFileService(state);
            const csvService = new CsvService({
                baseUrl,
                downloadService: platformDependentServices.fileDownloadService,
            });

            let selectionsByFileSet: { [index: string]: NumericRange[] };

            // If we have a specific path to get files from ignore selected files
            if (action.payload.fileFilters.length) {
                const fileSet = defaultFileSetFactory.create({
                    filters: action.payload.fileFilters,
                    fileService,
                });
                const count = await fileSet.fetchTotalCount();
                selectionsByFileSet = {
                    [fileSet.hash]: [new NumericRange(0, count - 1)],
                };
            } else {
                selectionsByFileSet = selection.selectors.getSelectedFileRangesByFileSet(
                    deps.getState()
                );
            }

            if (isEmpty(selectionsByFileSet)) {
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
            const message = await csvService.downloadCsv(
                selectionsByFileSet,
                action.payload.columns,
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

/**
 * Interceptor responsible for responding to an OPEN_FILES_IN_IMAGE_J action and triggering the
 * opening of a file in ImageJ
 */
const openFilesInImageJ = createLogic({
    type: OPEN_FILES_IN_IMAGE_J,
    async process(deps: ReduxLogicDeps, _, done) {
        const {
            persistentConfigService,
            systemNotificationService
        } = interactionSelectors.getPlatformDependentServices(deps.getState());
        const allenMountPoint = persistentConfigService.get(PersistedDataKeys.AllenMountPoint);
        const imageJInstallation = persistentConfigService.get(PersistedDataKeys.ImageJInstallation);
        
        // Collect the file paths from the selected files
        const selectionsByFileSet = selection.selectors.getSelectedFileRangesByFileSet(deps.getState());
        const filePaths = await Object.keys(selectionsByFileSet).reduce(async (pathsSoFar, fileSetHash) => {
            const fileSet = defaultFileSetFactory.get(fileSetHash) as FileSet;
            const ranges = selectionsByFileSet[fileSetHash];
            const files = await ranges.reduce(async (filesSoFar, range) => {
                return [
                    ...(await filesSoFar),
                    ...(await fileSet.fetchFileRange(range.from, range.to))
                ];
            }, [] as unknown as Promise<FmsFile[]>);
            return [
                ...(await pathsSoFar),
                ...files.map(file => allenMountPoint.substring(0, allenMountPoint.length - 6) + file.filePath)
            ];
        }, [] as unknown as Promise<string[]>);

        const reportErrorToUser = async (error: string) => {
            await systemNotificationService.showErrorMessage("Opening file in ImageJ",
                `Failure reported while attempting to open files: Files: ${filePaths}, Error: ${error}`);
        }
        try {
            // Create child process for ImageJ to open files in
            const imageJProcess = spawn(imageJInstallation, filePaths);
            // Handle unsuccessful startups of ImageJ (these will only be called if explorer is still open)
            imageJProcess.on("error", reportErrorToUser);
            imageJProcess.on("exit", async (code: number) => {
                if (code !== 0) {
                    await reportErrorToUser(`Status Code ${code}`);
                }
            });
        } catch (error) {
            await reportErrorToUser(error);
        }
        done();
    },
    async transform(deps: ReduxLogicDeps, next, reject) {
        const { persistentConfigService } = interactionSelectors.getPlatformDependentServices(deps.getState());

        // Ensure we have the necessary directories (Allen drive & Image J) so that we can properly open images
        let allenMountPoint = persistentConfigService.get(PersistedDataKeys.AllenMountPoint);
        let imageJInstallation = persistentConfigService.get(PersistedDataKeys.ImageJInstallation);
        if (!allenMountPoint) {
            allenMountPoint = await persistentConfigService.setAllenMountPoint();
        }
        if (!imageJInstallation && allenMountPoint !== PersistentConfigCancellationToken) {
            // On mac we can try to guess that ImageJ is installed under the applications folder
            if (os.platform() === 'darwin') {
                try {
                    await fs.promises.access('/applications/ImageJ', fs.constants.X_OK);
                    imageJInstallation = '/applications/ImageJ';
                } catch (_) {}
            }
            if (!imageJInstallation) {
                imageJInstallation = await persistentConfigService.setImageJExecutableLocation();
            }
        }

        if (allenMountPoint === PersistentConfigCancellationToken || imageJInstallation === PersistentConfigCancellationToken) {
            reject && reject(deps.action); // reject is typed as potentially undefined for some reason
        } else {
            next(deps.action);
        }
    }
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

export default [downloadManifest, cancelManifestDownloadLogic, openFilesInImageJ, showContextMenu];
