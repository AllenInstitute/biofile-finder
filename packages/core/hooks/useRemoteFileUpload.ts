import React from "react";
import { useSelector } from "react-redux";

import { interaction } from "../state";

type UploadResponse = { id: string; url: string };
type UploadFileCallback = (file: File) => Promise<UploadResponse>;

/**
 * Regular fetch with a timeout
 */
export async function fetchWithTimeout(
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

/**
 * Hook for determining whether the app can reach a server for remote file uploads
 */
export default function useRemoteFileUpload(): UploadFileCallback {
    const hasRemoteServer = useSelector(interaction.selectors.isRemoteFileUploadServerAvailable);
    const remoteUploadBaseUrl = useSelector(interaction.selectors.getTemporaryFileServiceBaseUrl);

    return React.useCallback(
        async (file: File): Promise<UploadResponse> => {
            if (!hasRemoteServer) {
                throw new Error("Remote server is not available");
            }
            const formData = new FormData();
            formData.append("file", file);
            const response = await fetchWithTimeout(`${remoteUploadBaseUrl}/upload`, {
                method: "POST",
                body: formData,
            });
            if (!response.ok) {
                throw new Error("Failed to upload file: " + response.statusText);
            }
            const jsonResponse = await response.json();
            return {
                id: jsonResponse.id,
                url: `${remoteUploadBaseUrl}/get-file/${jsonResponse.id}`,
            } as UploadResponse;
        },
        [hasRemoteServer, remoteUploadBaseUrl]
    );
}
