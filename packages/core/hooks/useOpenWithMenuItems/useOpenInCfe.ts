import * as React from "react";
import useRemoteFileUpload from "../useRemoteFileUpload";
import { uniqueId } from "lodash";
import Annotation from "../../entity/Annotation";
import FileSelection from "../../entity/FileSelection";
import { FileService } from "../../services";
import { interaction } from "../../state";
import { useDispatch } from "react-redux";

const CFE_URL = "http://dev-aics-dtp-001.corp.alleninstitute.org/cell-feature-explorer/dist/";

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
export const useOpenInCfe = (): [
    hasRemoteServer: boolean,
    openInCfe: (
        fileSelection: FileSelection,
        annotations: Annotation[],
        fileService: FileService
    ) => Promise<void>
] => {
    const dispatch = useDispatch();
    const [hasRemoteServer, uploadCsv] = useRemoteFileUpload();
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
                const { url } = await uploadCsv(file);
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
            window.open(cfeUrl, "_blank");
        },
        [hasRemoteServer, dispatch, uploadCsv]
    );
    return [hasRemoteServer, openInCfe];
};
