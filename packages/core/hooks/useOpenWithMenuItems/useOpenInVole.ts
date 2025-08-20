import { uniqueId } from "lodash";
import FileDetail from "../../entity/FileDetail";
import FileSelection from "../../entity/FileSelection";
import { RemoteFileUploadServerConnection } from "../useRemoteFileUpload";
import { getFileExtension } from "./utils";
import { useDispatch } from "react-redux";
import { interaction } from "../../state";

type OpenInVoleCallback = (
    fileSelection: FileSelection,
    fileDetails: FileDetail | undefined
) => Promise<void>;

// const VOLE_BASE_URL = "https://volumeviewer.allencell.org/viewer";
const VOLE_BASE_URL = "http://localhost:9020/viewer";

/**
 * Hook that returns a callback to open one or more files in Vol-E.
 *
 * @param remoteConnection - The remote server connection object.
 * @returns An `OpenInVoleCallback` callback taking a file selection and file
 * details. If the remote server is not available, it will attempt to open a
 * single file directly in Vol-E.
 */
const useOpenInVole = (remoteConnection: RemoteFileUploadServerConnection): OpenInVoleCallback => {
    const dispatch = useDispatch();
    const { hasRemoteServer, uploadFile } = remoteConnection;

    const openInVole = async (
        fileSelection: FileSelection,
        fileDetails: FileDetail | undefined
    ) => {
        const processId = uniqueId();
        // TODO: Handle single file selection vs multiscene?
        if (!hasRemoteServer) {
            // Try to open the single file
            if (fileDetails) {
                window.open(`${VOLE_BASE_URL}?url=${fileDetails.path}`);
            } else {
                throw new Error("Could not open Vol-E: no file details provided.");
            }
        }
        dispatch(interaction.actions.processStart(processId, "Opening in Vol-E..."));

        const allDetails = await fileSelection.fetchAllDetails();
        const details = allDetails.filter((detail) => {
            const fileExt = getFileExtension(detail);
            return fileExt === "zarr" || fileExt === "";
        });

        const scenes: string[] = [];
        const meta: Record<string, unknown>[] = [];

        for (const detail of details) {
            const sceneMeta: Record<string, unknown> = {};
            for (const annotation of detail.annotations) {
                const isSingleValue = annotation.values.length === 1;
                const value = isSingleValue ? annotation.values[0] : annotation.values;
                sceneMeta[annotation.name] = value;
            }
            scenes.push(detail.path);
            meta.push(sceneMeta);
        }

        // Start on the focused scene
        const sceneIdx = details.findIndex((detail) => detail.path === fileDetails?.path);
        const sceneStr = sceneIdx < 1 ? "" : `&scene=${sceneIdx}`;

        const fileJson = {
            scenes,
            meta,
        };
        const file = new File([JSON.stringify(fileJson)], "scenes.json");
        const response = await uploadFile(file);

        const manifestUrl = response.url;
        const voleUrl = `${VOLE_BASE_URL}?manifest=${manifestUrl}${sceneStr}`;
        window.open(voleUrl, "_blank", "noopener,noreferrer");
        // TODO: Include link here in the popup in case the new tab didn't open
        console.log(voleUrl);
        dispatch(
            interaction.actions.processSuccess(processId, "Launched Vol-E in a new tab: " + voleUrl)
        );
    };

    return openInVole;
};

export default useOpenInVole;
