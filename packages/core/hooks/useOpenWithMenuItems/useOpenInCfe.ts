import * as React from "react";
import { RemoteFileUploadServerConnection } from "../useRemoteFileUpload";
import { uniqueId } from "lodash";
import Annotation from "../../entity/Annotation";
import FileSelection from "../../entity/FileSelection";
import { FileService } from "../../services";
import { interaction } from "../../state";
import { useDispatch } from "react-redux";

const CFE_URL = "http://dev-aics-dtp-001.corp.alleninstitute.org/cell-feature-explorer/dist/";

type OpenInCfeCallback = (
    fileSelection: FileSelection,
    annotations: Annotation[],
    fileService: FileService
) => Promise<void>;

/**
 * Opens a file selection in Cell Feature Explorer, using a remote server to
 * temporarily upload the file and generate a URL for CFE for cross-site access.
 *
 * @returns a tuple containing:
 * - `hasRemoteServer`: boolean indicating if the remote server is available
 * - `openInCfe`: a function that opens the provided selections in Cell Feature
 *   Explorer, if the remote server is available. If the server is not
 *   available, dispatches an error.
 */
const useOpenInCfe = (
    remoteServerConnection: RemoteFileUploadServerConnection
): OpenInCfeCallback => {
    const { hasRemoteServer, uploadFile } = remoteServerConnection;
    const dispatch = useDispatch();
    const openInCfe = React.useCallback(
        async (
            fileSelection: FileSelection,
            annotations: Annotation[],
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
            }
            dispatch(
                interaction.actions.processStart(processId, "Opening in Cell Feature Explorer...")
            );
            const stringAnnotations = annotations.map((annotation) => annotation.name);
            stringAnnotations.sort();

            let file: File;
            let cfeUrl: string;
            try {
                file = await fileService.getManifest(
                    stringAnnotations,
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
                cfeUrl = `${CFE_URL}?dataset=csv&csvUrl=${encodeURIComponent(url)}`;
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
            // NOTE: In certain async contexts, window.open will not open after a delay
            // that is too long. The confirmation popup needs to include a clickable link
            // if this happens.
            window.open(cfeUrl, "_blank", "noopener,noreferrer");
            console.log(cfeUrl);
            // TODO: Include link here in the popup in case the new tab didn't open
            dispatch(
                interaction.actions.processSuccess(
                    processId,
                    "Launched Cell Feature Explorer in a new tab: " + cfeUrl
                )
            );
        },
        [hasRemoteServer, dispatch, uploadFile]
    );
    return openInCfe;
};

export default useOpenInCfe;
