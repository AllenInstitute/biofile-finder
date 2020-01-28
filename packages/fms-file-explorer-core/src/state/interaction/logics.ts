import { createLogic } from "redux-logic";

import { ReduxLogicDeps } from "../";
import { DOWNLOAD_MANIFEST } from "./actions";
import selection from "../selection";
import { DefaultFileService } from "../../services/FileService";

/**
 * Interceptor responsible for responding to a DOWNLOAD_MANIFEST action and triggering a manifest download.
 *
 * TODO: In this temporary, band-aid implementation, the CSV manifest is built-up in the frontend. This will change to
 * delegate the creation of the manifest to the file-download-service, which already has facilities for manifest
 * creation in place, but needs to be hooked up to the file-explorer-service.
 */
const downloadManifest = createLogic({
    type: DOWNLOAD_MANIFEST,
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { getState } = deps;
        try {
            const idsOfSelectedFiles = selection.selectors.getSelectedFiles(getState());
            const files = await DefaultFileService.getFilesById(idsOfSelectedFiles);
            console.log(files);
        } catch (err) {
            console.error("Something went wrong, nobody knows why. But here's a hint:", err);
        } finally {
            done();
        }
    },
});

export default [downloadManifest];
