import React, { useCallback, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { getTemporaryFileServiceBaseUrl } from "../state/interaction/selectors";

const API_PING = "/ping";
const API_UPLOAD = "/upload";
const API_GET_FILE = "/get-file";

type UploadResponse = { id: string; url: string };
type UploadFileCallback = (file: File) => Promise<UploadResponse>;

export type RemoteFileUploadServerConnection = {
    hasRemoteServer: boolean;
    uploadFile: UploadFileCallback;
};

async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs = 5000
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
        response = await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
        if ((error as Error).name === "AbortError") {
            throw new Error(`Request timed out after ${timeoutMs} ms`);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
    return response;
}

const MAX_FETCH_ATTEMPTS = 3;
const FETCH_TIMEOUT_MS = 5000;

const useRemoteFileUpload = (): RemoteFileUploadServerConnection => {
    const [hasRemoteServer, setHasRemoteServer] = React.useState(false);
    const remoteUploadBaseUrl = useSelector(getTemporaryFileServiceBaseUrl);

    // Note: this only checks for changes to the remote server availability
    // on initialization and does not poll the server continuously.
    useEffect(() => {
        let attempt = 1;
        let timeoutId: NodeJS.Timeout | null = null;
        const checkRemoteServer = async () => {
            let lastError: Error | undefined;
            if (attempt <= MAX_FETCH_ATTEMPTS) {
                attempt++;
                try {
                    const response = await fetchWithTimeout(
                        `${remoteUploadBaseUrl}${API_PING}`,
                        {},
                        FETCH_TIMEOUT_MS
                    );
                    if (response.ok) {
                        setHasRemoteServer(true);
                        return;
                    }
                } catch (error) {
                    lastError = error as Error;
                }
                timeoutId = setTimeout(checkRemoteServer, Math.pow(2, attempt) * 500);
            } else {
                setHasRemoteServer(false);
                console.warn(
                    `Could not connect to remote file upload server after ${MAX_FETCH_ATTEMPTS} attempts. Certain viewer integrations may be disabled.`,
                    lastError
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

    const uploadFile: UploadFileCallback = useCallback(
        async (file: File): Promise<UploadResponse> => {
            if (!hasRemoteServer) {
                throw new Error("Remote server is not available");
            }
            const formData = new FormData();
            formData.append("file", file);
            const response = await fetchWithTimeout(
                `${remoteUploadBaseUrl}${API_UPLOAD}`,
                {
                    method: "POST",
                    body: formData,
                },
                FETCH_TIMEOUT_MS
            );
            if (!response.ok) {
                throw new Error("Failed to upload file: " + response.statusText);
            }
            const jsonResponse = await response.json();
            return {
                id: jsonResponse.id,
                url: `${remoteUploadBaseUrl}${API_GET_FILE}/${jsonResponse.id}`,
            } as UploadResponse;
        },
        [hasRemoteServer]
    );

    const status = useMemo(() => ({ hasRemoteServer, uploadFile }), [hasRemoteServer, uploadFile]);
    return status;
};

export default useRemoteFileUpload;
