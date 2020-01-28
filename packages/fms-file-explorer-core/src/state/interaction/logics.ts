import { createLogic } from "redux-logic";

import { ReduxLogicDeps } from "../";
import { DOWNLOAD_MANIFEST } from "./actions";
import metadata from "../metadata";
import selection from "../selection";
import { DefaultFileService } from "../../services/FileService";
import { DefaultCsvService } from "../../services/CsvService";

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
            const state = getState();
            const idsOfSelectedFiles = selection.selectors.getSelectedFiles(state);
            const annotations = metadata.selectors.getAnnotations(state);

            const files = await DefaultFileService.getFilesById(idsOfSelectedFiles);
            const csv = DefaultCsvService.toCsv(files, annotations);

            // download the file
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", "manifest.csv");
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("Something went wrong, nobody knows why. But here's a hint:", err);
        } finally {
            done();
        }
    },
});

export default [downloadManifest];
