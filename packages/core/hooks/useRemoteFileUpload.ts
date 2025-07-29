import React, { useCallback, useEffect } from "react";

const REMOTE_SERVER_URL = "127.0.0.1:5000";
const API_PING = "/ping";
const API_UPLOAD = "/upload";

type UploadResponse = { id: string };
type UploadFileCallback = (file: File) => Promise<UploadResponse>;

const useRemoteFileUpload = (): [hasRemoteServer: boolean, uploadCsv: UploadFileCallback] => {
    const [hasRemoteServer, setHasRemoteServer] = React.useState(false);

    useEffect(() => {
        // TODO: Have the check perform on a regular interval
        // and use exponential backoff when the server is not reachable.
        const checkRemoteServer = async () => {
            try {
                const response = await fetch(`http://${REMOTE_SERVER_URL}${API_PING}`);
                if (response.ok) {
                    setHasRemoteServer(true);
                } else {
                    console.error("Remote server is not reachable");
                }
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
            const response = await fetch(`http://${REMOTE_SERVER_URL}${API_UPLOAD}`, {
                method: "POST",
                body: formData,
            });
            if (!response.ok) {
                // TODO: Add error handling (see BFF's native error messaging?)
                throw new Error("Failed to upload file");
            }
            return (await response.json()) as UploadResponse;
        },
        [hasRemoteServer]
    );

    return [hasRemoteServer, uploadCsv];
};

export default useRemoteFileUpload;
