import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { uniqueId } from "lodash";

import { RemoteFileUploadServerConnection } from "../useRemoteFileUpload";
import FileSelection from "../../entity/FileSelection";
import { FileService } from "../../services";
import { interaction } from "../../state";
import { getCellFeatureExplorerBaseUrl } from "../../state/interaction/selectors";

type OpenInCfeCallback = (
    fileSelection: FileSelection,
    annotationNames: string[],
    fileService: FileService
) => Promise<void>;

/**
 * Opens a file selection in Cell Feature Explorer, using a remote server to
 * temporarily upload the file and generate a URL for CFE for cross-site access.
 *
 * @returns a callback that takes a file selection, annotations, and file
 * service, and attempts to open CFE in a new tab with the selected files
 * loaded.
 */
const useOpenInCfe = (
    remoteServerConnection: RemoteFileUploadServerConnection
): OpenInCfeCallback => {
    const { hasRemoteServer, uploadFile } = remoteServerConnection;
    const dispatch = useDispatch();
    const cfeBaseUrl = useSelector(getCellFeatureExplorerBaseUrl);

    const openInCfe = React.useCallback(
        async (
            fileSelection: FileSelection,
            annotationNames: string[],
            fileService: FileService
        ) => {
            const processId = uniqueId();
            if (!hasRemoteServer) {
                dispatch(
                    interaction.actions.processError(
                        processId,
                        "The integration with Cell Feature Explorer is currently not available. Please try again later."
                    )
                );
                return;
            }
            dispatch(
                interaction.actions.processStart(processId, "Opening in Cell Feature Explorer...")
            );

            let file: File;
            let cfeUrl: string;
            try {
                file = await fileService.getManifest(
                    annotationNames,
                    fileSelection.toCompactSelectionList(),
                    "csv"
                );
            } catch (error) {
                console.error("Error getting manifest for CFE: ", error);
                dispatch(
                    interaction.actions.processError(
                        processId,
                        "Could not generate manifest for Cell Feature Explorer. Error: " +
                            (error as Error).message
                    )
                );
                return;
            }
            try {
                const { url } = await uploadFile(file);
                cfeUrl = `${cfeBaseUrl}/?dataset=csv&csvUrl=${encodeURIComponent(url)}`;
            } catch (error) {
                console.error("Error uploading CSV for CFE: ", error);
                dispatch(
                    interaction.actions.processError(
                        processId,
                        "Could not upload CSV to Cell Feature Explorer. Error: " +
                            (error as Error).message
                    )
                );
                return;
            }
            // NOTE: In certain async contexts, window.open will not open after
            // a delay that is too long. The confirmation popup needs to include
            // a clickable link if this happens.
            window.open(cfeUrl, "_blank", "noopener,noreferrer");
            // TODO: Include clickable link here in the popup in case the new tab didn't open
            dispatch(
                interaction.actions.processSuccess(
                    processId,
                    "Launched Cell Feature Explorer in a new tab: " + cfeUrl
                )
            );
        },
        [hasRemoteServer, cfeBaseUrl, dispatch, uploadFile]
    );
    return openInCfe;
};

export default useOpenInCfe;
