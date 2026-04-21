// Stub. Remote file upload feature removed.
export function fetchWithTimeout(
    _url: string,
    _options: RequestInit = {},
    _timeoutMs: number = 5000
): Promise<Response> {
    return Promise.reject(new Error("Remote upload is not available in this build."));
}

export default function useRemoteFileUpload() {
    return {
        isServerAvailable: false,
        uploadFile: () =>
            Promise.reject(new Error("Remote upload is not available in this build.")),
    };
}
