import React, { useCallback, useEffect } from "react";
import { useDispatch } from "react-redux";
import { interaction } from "../state";
import { uniqueId } from "lodash";

const REMOTE_SERVER_URL = "http://dev-aics-dtp-001.corp.alleninstitute.org:8080";
const API_PING = "/ping";
const API_UPLOAD = "/upload";
const API_GET_FILE = "/get-file";

type UploadResponse = { id: string; url: string };
type UploadFileCallback = (file: File) => Promise<UploadResponse>;

const MAX_FETCH_ATTEMPTS = 5;

const useRemoteFileUpload = (): [hasRemoteServer: boolean, uploadCsv: UploadFileCallback] => {
    const dispatch = useDispatch();
    const [hasRemoteServer, setHasRemoteServer] = React.useState(false);

    // Note: this only checks for changes to the remote server availability
    // on initialization and does not poll the server continuously.
    useEffect(() => {
        let attempt = 1;
        let timeoutId: NodeJS.Timeout | null = null;
        const checkRemoteServer = async () => {
            if (attempt <= MAX_FETCH_ATTEMPTS) {
                attempt++;
                try {
                    const response = await fetch(`${REMOTE_SERVER_URL}${API_PING}`);
                    if (response.ok) {
                        setHasRemoteServer(true);
                        return;
                    }
                } catch (_error) {}
                timeoutId = setTimeout(checkRemoteServer, Math.pow(2, attempt) * 500);
            } else {
                setHasRemoteServer(false);
                console.warn(
                    `Could not connect to remote file upload server after ${MAX_FETCH_ATTEMPTS} attempts. Certain viewer integrations may be disabled.`
                );
            }
        };

        timeoutId = setTimeout(checkRemoteServer, 10);
        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, []);

    const uploadCsv: UploadFileCallback = useCallback(
        async (file: File): Promise<UploadResponse> => {
            const processId = uniqueId();
            if (!hasRemoteServer) {
                throw new Error("Remote server is not available");
            }
            dispatch(
                interaction.actions.processStart(processId, "Opening in Cell Feature Explorer.")
            );
            const formData = new FormData();
            formData.append("file", file);
            const response = await fetch(`${REMOTE_SERVER_URL}${API_UPLOAD}`, {
                method: "POST",
                body: formData,
            });
            if (!response.ok) {
                throw new Error("Failed to upload file: " + response.statusText);
            }
            const jsonResponse = await response.json();
            return {
                id: jsonResponse.id,
                url: `${REMOTE_SERVER_URL}${API_GET_FILE}/${jsonResponse.id}`,
            } as UploadResponse;
        },
        [hasRemoteServer, dispatch]
    );

    return [hasRemoteServer, uploadCsv];
};

export default useRemoteFileUpload;
