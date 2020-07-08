import { isEmpty } from "lodash";
import { createLogic } from "redux-logic";

import { ReduxLogicDeps, selection } from "../";
import { DOWNLOAD_MANIFEST } from "./actions";
import * as interactionSelectors from "./selectors";
import CsvService from "../../services/CsvService";

/**
 * Interceptor responsible for responding to a DOWNLOAD_MANIFEST action and triggering a manifest download.
 */
const downloadManifest = createLogic({
    type: DOWNLOAD_MANIFEST,
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { getState } = deps;
        try {
            const state = getState();
            const baseUrl = interactionSelectors.getFileExplorerServiceBaseUrl(state);
            const csvService = new CsvService({ baseUrl });

            const existingSelectionsByFileSet = selection.selectors.getSelectedFileRangesByFileSet(
                deps.getState()
            );

            if (isEmpty(existingSelectionsByFileSet)) {
                return;
            }

            await csvService.downloadCsv(existingSelectionsByFileSet);
        } catch (err) {
            console.error("Something went wrong, nobody knows why. But here's a hint:", err);
        } finally {
            done();
        }
    },
});

export default [downloadManifest];
