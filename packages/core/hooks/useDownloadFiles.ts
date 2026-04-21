// Stub. Download feature removed.
export default function useDownloadFiles(
    _fileDetails?: unknown
): {
    isDownloadDisabled: boolean;
    disabledDownloadReason: string;
    onDownload: () => void;
} {
    return {
        isDownloadDisabled: true,
        disabledDownloadReason: "Download is not available in this build.",
        onDownload: () => {
            /* noop */
        },
    };
}
