import { isEmpty, uniqueId } from "lodash";
import { createLogic } from "redux-logic";

import { ReduxLogicDeps, selection } from "../";
import {
    DOWNLOAD_MANIFEST,
    succeedManifestDownload,
    failManifestDownload,
    removeStatus,
    startManifestDownload,
} from "./actions";
import * as interactionSelectors from "./selectors";
import CsvService from "../../services/CsvService";
import { CancellationToken } from "../../services/FileDownloadService";
import NumericRange from "../../entity/NumericRange";
import { defaultFileSetFactory } from "../../entity/FileSet/FileSetFactory";

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
            if (action.payload) {
                const fileSet = defaultFileSetFactory.create({
                    filters: action.payload,
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

            dispatch(startManifestDownload(manifestDownloadProcessId));
            const message = await csvService.downloadCsv(selectionsByFileSet);

            if (message === CancellationToken) {
                dispatch(removeStatus(manifestDownloadProcessId));
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
