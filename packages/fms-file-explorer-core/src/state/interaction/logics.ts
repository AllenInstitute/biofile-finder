import { isEmpty, uniqueId } from "lodash";
import { createLogic } from "redux-logic";

import { ReduxLogicDeps, selection } from "../";
import {
    DOWNLOAD_MANIFEST,
    succeedManifestDownload,
    failManifestDownload,
    startManifestDownload,
} from "./actions";
import * as interactionSelectors from "./selectors";
import CsvService from "../../services/CsvService";

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
            await csvService.downloadCsv(existingSelectionsByFileSet, () => {
                dispatch(succeedManifestDownload(manifestDownloadProcessId));
            });
        } catch (err) {
            console.error("Something went wrong, nobody knows why. But here's a hint:", err);
            dispatch(failManifestDownload(manifestDownloadProcessId));
        } finally {
            done();
        }
    },
});

export default [downloadManifest];
