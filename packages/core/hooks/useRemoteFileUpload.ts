import React, { useCallback, useEffect } from "react";
const REMOTE_SERVER_URL = "http://dev-aics-dtp-001.corp.alleninstitute.org:8080";
const API_PING = "/ping";
const API_UPLOAD = "/upload";
const API_GET_FILE = "/get-file";

type UploadResponse = { id: string; url: string };
type UploadFileCallback = (file: File) => Promise<UploadResponse>;

const MAX_FETCH_ATTEMPTS = 5;

const useRemoteFileUpload = (): [hasRemoteServer: boolean, uploadCsv: UploadFileCallback] => {
    const [hasRemoteServer, setHasRemoteServer] = React.useState(false);

    useEffect(() => {
        // TODO: Have the check perform on a regular interval
        const checkRemoteServer = async () => {
            try {
                for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt++) {
                    const response = await fetch(`${REMOTE_SERVER_URL}${API_PING}`);
                    if (response.ok) {
                        setHasRemoteServer(true);
                        return;
                    }
                    await new Promise((resolve) =>
                        setTimeout(resolve, Math.pow(2, attempt) * 1000)
                    );
                }
                console.error("Remote file upload server is not reachable.");
            } catch (error) {
                console.error("Error checking remote server:", error);
            }
        };

        checkRemoteServer();
    }, []);

    const uploadCsv: UploadFileCallback = useCallback(
        async (file: File): Promise<UploadResponse> => {
            if (!hasRemoteServer) {
                throw new Error("No remote server available");
            }
            const formData = new FormData();
            formData.append("file", file);
            const response = await fetch(`${REMOTE_SERVER_URL}${API_UPLOAD}`, {
                method: "POST",
                body: formData,
            });
            if (!response.ok) {
                // TODO: Add error handling (see BFF's native error messaging?)
                throw new Error("Failed to upload file");
            }
            const jsonResponse = await response.json();
            return {
                id: jsonResponse.id,
                url: `${REMOTE_SERVER_URL}${API_GET_FILE}/${jsonResponse.id}`,
            } as UploadResponse;
        },
        [hasRemoteServer]
    );

    return [hasRemoteServer, uploadCsv];
};

export default useRemoteFileUpload;
