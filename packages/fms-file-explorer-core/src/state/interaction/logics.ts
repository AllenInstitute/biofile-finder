import { createLogic } from "redux-logic";

import { ReduxLogicDeps } from "../";
import { DOWNLOAD_MANIFEST } from "./actions";

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
        console.warn("This functionality was disabled. It will be re-enabled as part of FMS-1224.");
    },
});

export default [downloadManifest];
