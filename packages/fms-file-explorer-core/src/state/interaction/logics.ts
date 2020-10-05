import * as os from "os";
import * as path from "path";

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
import FileSet from "../../entity/FileSet";
import { defaultFileSetFactory } from "../../entity/FileSet/FileSetFactory";
import NumericRange from "../../entity/NumericRange";
import { PersistedDataKeys, PersistentConfigCancellationToken } from "../../services/PersistentConfigService";

const childProcess = require("child_process");

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

            let selectionsByFileSet: Map<FileSet, NumericRange[]>;

            // If we have a specific path to get files from ignore selected files
            if (action.payload.fileFilters.length) {
                const fileSet = defaultFileSetFactory.create({
                    filters: action.payload.fileFilters,
                    fileService,
                });
                const count = await fileSet.fetchTotalCount();
                selectionsByFileSet = new Map([
                    [fileSet, [new NumericRange(0, count - 1)]],
                ]);
            } else {
                const fileSelection = selection.selectors.getFileSelection(state);
                selectionsByFileSet = fileSelection.groupByFileSet();
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
        const imageJExecutable = persistentConfigService.get(PersistedDataKeys.ImageJExecutable);
        
        // Collect the file paths from the selected files
        const fileSelection = selection.selectors.getFileSelection(deps.getState());
        const selectedFilesDetails = await fileSelection.fetchAllDetails();
        const filePaths = selectedFilesDetails.map((file) => (
            allenMountPoint + path.normalize(file.filePath.substring(6))
        ));

        const reportErrorToUser = async (error: string) => {
            await systemNotificationService.showErrorMessage("Opening file in ImageJ",
                `Failure reported while attempting to open files: Files: ${filePaths}, Error: ${error}`);
        }
        try {
            let childProcessArgs: string[];
            // Create a child process for ImageJ to open files in
            if (!imageJExecutable && os.platform() === 'darwin') {
                // On MacOS we can simply supply the name of an app to open it
                childProcessArgs = [`open -a "ImageJ.app" --args ${filePaths}`];
            } else {
                childProcessArgs = [imageJExecutable, filePaths];
            }
            const imageJProcess = childProcess.spawn(...childProcessArgs);
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
        let imageJExecutable = persistentConfigService.get(PersistedDataKeys.ImageJExecutable);
        if (!allenMountPoint) {
            allenMountPoint = await persistentConfigService.setAllenMountPoint();
        }
        // If the user didn't already cancel via the Allen Drive selection & isn't on a Mac, make sure we have
        // an ImageJ executable path
        if (!imageJExecutable && allenMountPoint !== PersistentConfigCancellationToken && os.platform() !== 'darwin') {
            imageJExecutable = await persistentConfigService.setImageJExecutableLocation();
        }

        if (allenMountPoint === PersistentConfigCancellationToken || imageJExecutable === PersistentConfigCancellationToken) {
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
