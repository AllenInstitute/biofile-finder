import { isEmpty, uniqueId } from "lodash";
import { createLogic } from "redux-logic";

import { ReduxLogicDeps, selection } from "../";
import {
    DOWNLOAD_MANIFEST,
    succeedManifestDownload,
    failManifestDownload,
    startManifestDownload,
    clearStatus,
} from "./actions";
import * as interactionSelectors from "./selectors";
import CsvService from "../../services/CsvService";
import { CancellationToken } from "../../services/FileDownloadService";

/**
 * Interceptor responsible for responding to a DOWNLOAD_MANIFEST action and triggering a manifest download.
 */
const downloadManifest = createLogic({
    type: DOWNLOAD_MANIFEST,
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { getState } = deps;
        const manifestDownloadProcessId = uniqueId();

        try {
            const state = getState();
            const baseUrl = interactionSelectors.getFileExplorerServiceBaseUrl(state);
            const platformDependentServices = interactionSelectors.getPlatformDependentServices(
                state
            );
            const csvService = new CsvService({
                baseUrl,
                downloadService: platformDependentServices.fileDownloadService,
            });

            const existingSelectionsByFileSet = selection.selectors.getSelectedFileRangesByFileSet(
                deps.getState()
            );

            if (isEmpty(existingSelectionsByFileSet)) {
                return;
            }

            dispatch(startManifestDownload(manifestDownloadProcessId));
            const message = await csvService.downloadCsv(existingSelectionsByFileSet);

            if (message === CancellationToken) {
                dispatch(clearStatus(manifestDownloadProcessId));
                return;
            }

            dispatch(succeedManifestDownload(manifestDownloadProcessId, message));
        } catch (err) {
            dispatch(failManifestDownload(manifestDownloadProcessId, err));
        } finally {
            done();
        }
    },
});

export default [downloadManifest];
