import { sumBy, throttle, uniqueId } from "lodash";
import { Dispatch } from "redux";

import {
    cancelFileDownload,
    processError,
    processProgress,
    processStart,
    processSuccess,
    removeStatus,
} from "./actions";
import annotationFormatterFactory, { AnnotationType } from "../../entity/AnnotationFormatter";
import ConcurrentTaskQueue from "../../entity/ConcurrentTaskQueue";
import { DownloadResolution, DownloadResult, FileInfo } from "../../services/FileDownloadService";
import FileDownloadService from "../../services/FileDownloadService";
import S3StorageService from "../../services/S3StorageService";

const MAX_FILES_IN_MSG = 3;
const MAX_PARALLEL_DOWNLOADS = 5;

const numberFormatter = annotationFormatterFactory(AnnotationType.NUMBER);

// ── Display helpers ──────────────────────────────────────────────────

function formatBytes(bytes: number, hasUnknownSize = false): string {
    const display = numberFormatter.displayValue(bytes, "bytes");
    return hasUnknownSize ? `Unknown, but at least ${display}` : display;
}

function buildFileListHtml(names: string[]): string | undefined {
    if (names.length <= 1) return undefined;
    return names.map((n) => `• ${n}`).join("<br/>");
}

// ── File resolution ──────────────────────────────────────────────────

export async function resolveFileSizes(
    files: FileInfo[],
    s3StorageService: S3StorageService
): Promise<boolean> {
    let someUnknown = false;
    await Promise.all(
        files.map(async (file) => {
            if (!file.size) {
                file.size = await s3StorageService.getCloudObjectSize(file.path);
                if (file.size === undefined) someUnknown = true;
            }
        })
    );
    return someUnknown;
}

// ── Result classification ────────────────────────────────────────────

export type FileDownloadSettledResult = PromiseSettledResult<{
    file: FileInfo;
    result: DownloadResult;
}>;

function classifyResults(results: FileDownloadSettledResult[]) {
    const failed = results.filter(
        (r) =>
            r.status === "rejected" ||
            (r.status === "fulfilled" &&
                r.value.result.resolution !== DownloadResolution.SUCCESS &&
                r.value.result.resolution !== DownloadResolution.CANCELLED)
    );
    const cancelled = results.filter(
        (r) =>
            r.status === "fulfilled" &&
            r.value.result.resolution === DownloadResolution.CANCELLED
    );
    return { failed, cancelled };
}

function buildErrorMessage(
    failed: FileDownloadSettledResult[],
    totalCount: number,
    allFileNames: string[]
): { errorMsg: string; errorFullMsg?: string } {
    const fileWord = totalCount === 1 ? "file" : "files";
    const failedNames = failed.map((r) =>
        r.status === "fulfilled" ? r.value.file.name : "unknown"
    );
    const errorMsg =
        totalCount === 1
            ? `File download failed for file ${allFileNames[0]}. Details:<br/>${
                  failed[0].status === "rejected"
                      ? failed[0].reason instanceof Error
                          ? failed[0].reason.message
                          : failed[0].reason
                      : "Unknown error"
              }`
            : `Download failed for ${failed.length} of ${totalCount} ${fileWord}:<br/>${failedNames
                  .slice(0, MAX_FILES_IN_MSG)
                  .join(", ")}`;
    const errorFullMsg =
        failedNames.length > MAX_FILES_IN_MSG
            ? `Download failed for ${failed.length} of ${totalCount} ${fileWord}:<br/>${failedNames.join(", ")}`
            : undefined;
    return { errorMsg, errorFullMsg };
}

export function dispatchResultNotification(
    dispatch: Dispatch,
    groupProcessId: string,
    settledResults: FileDownloadSettledResult[],
    totalCount: number,
    allFileNames: string[],
    wasCancelled: boolean
): void {
    if (wasCancelled) {
        dispatch(removeStatus(groupProcessId));
        return;
    }

    const { failed, cancelled } = classifyResults(settledResults);

    if (failed.length > 0) {
        const { errorMsg, errorFullMsg } = buildErrorMessage(failed, totalCount, allFileNames);
        dispatch(processError(groupProcessId, errorMsg, errorFullMsg));
    } else if (cancelled.length === totalCount) {
        dispatch(removeStatus(groupProcessId));
    } else {
        const succeededCount = totalCount - cancelled.length;
        const firstResult =
            settledResults[0]?.status === "fulfilled"
                ? settledResults[0].value.result
                : undefined;
        const msg =
            totalCount === 1
                ? firstResult?.msg || "Download started successfully."
                : `Successfully downloaded ${succeededCount} ${
                      succeededCount === 1 ? "file" : "files"
                  }.`;
        dispatch(processSuccess(groupProcessId, msg));
    }
}

// ── Progress tracking ────────────────────────────────────────────────

export interface DownloadProgressTracker {
    groupProcessId: string;
    downloadRequestIds: string[];
    reportProgress(transferredBytes: number): void;
    dispatchStart(): void;
    cancel(): void;
    readonly isCancelled: boolean;
    /** @internal Used by executeBatchedDownloads to wire up queue cancellation */
    set queue(q: ConcurrentTaskQueue);
}

export function createProgressTracker(
    dispatch: Dispatch,
    files: FileInfo[],
    someFilesHaveUnknownSize: boolean
): DownloadProgressTracker {
    const totalBytes = sumBy(files, "size") || 0;
    const totalBytesDisplay = formatBytes(totalBytes, someFilesHaveUnknownSize);
    const allFileIds = files.map((f) => f.id);
    const allFileNames = files.map((f) => f.name);
    const fileWord = files.length === 1 ? "file" : "files";

    const truncatedFileListHtml =
        allFileNames.length > 1
            ? buildFileListHtml(allFileNames.slice(0, MAX_FILES_IN_MSG))
            : undefined;
    const fullFileListHtml =
        allFileNames.length > MAX_FILES_IN_MSG
            ? buildFileListHtml(allFileNames)
            : undefined;

    const groupProcessId = uniqueId();
    const downloadRequestIds = files.map(() => uniqueId());

    let cancelled = false;
    let downloadQueue: ConcurrentTaskQueue | undefined;
    let bytesDownloaded = 0;

    const throttledDispatch = throttle(() => {
        if (cancelled) return;
        const bytesDisplay = numberFormatter.displayValue(bytesDownloaded, "bytes");
        const header = `Downloading ${files.length} ${fileWord}.<br/>${bytesDisplay} out of ${totalBytesDisplay} set to download`;
        const msg = truncatedFileListHtml ? `${header}<br/>${truncatedFileListHtml}` : header;
        const fullMsg = fullFileListHtml ? `${header}<br/>${fullFileListHtml}` : undefined;
        dispatch(
            processProgress(
                groupProcessId,
                totalBytes ? bytesDownloaded / totalBytes : 0,
                msg,
                doCancel,
                allFileIds,
                fullMsg
            )
        );
    }, 1000);

    function doCancel() {
        cancelled = true;
        throttledDispatch.cancel();
        downloadQueue?.cancel();
        dispatch(removeStatus(groupProcessId));
        downloadRequestIds.forEach((id) => dispatch(cancelFileDownload(id)));
    }

    return {
        groupProcessId,
        downloadRequestIds,
        get isCancelled() {
            return cancelled;
        },
        reportProgress(transferredBytes: number) {
            bytesDownloaded += transferredBytes;
            throttledDispatch();
        },
        dispatchStart() {
            if (someFilesHaveUnknownSize) return;
            const header =
                files.length === 1
                    ? `Downloading ${allFileNames[0]}.<br/>${totalBytesDisplay} set to download`
                    : `Downloading ${files.length} ${fileWord}.<br/>${totalBytesDisplay} set to download`;
            const msg = truncatedFileListHtml ? `${header}<br/>${truncatedFileListHtml}` : header;
            const fullMsg = fullFileListHtml ? `${header}<br/>${fullFileListHtml}` : undefined;
            dispatch(processStart(groupProcessId, msg, doCancel, allFileIds, fullMsg));
        },
        cancel: doCancel,
        // This enables executeBatchedDownloads() to set the queue after the tracker is created
        // allowing the tracker to cancel the queue if the user cancels the download before
        // all tasks have been added to the queue
        /** @internal Allow the tracker to cancel the download queue */
        set queue(q: ConcurrentTaskQueue) {
            downloadQueue = q;
        },
    } as DownloadProgressTracker;
}

// ── Batched execution ────────────────────────────────────────────────

export async function executeBatchedDownloads(
    files: FileInfo[],
    fileDownloadService: FileDownloadService,
    tracker: DownloadProgressTracker
): Promise<FileDownloadSettledResult[]> {
    const queue = new ConcurrentTaskQueue(MAX_PARALLEL_DOWNLOADS);
    tracker.queue = queue;

    const results: FileDownloadSettledResult[] = files.map();

    const results = files.map((file, index) => {
        queue.push(async () => {
            if (tracker.isCancelled) {
                results[index] = {
                    status: "fulfilled",
                    value: {
                        file,
                        result: {
                            downloadRequestId: tracker.downloadRequestIds[index],
                            resolution: DownloadResolution.CANCELLED,
                        },
                    },
                };
                return;
            }

            try {
                const result = await fileDownloadService.download(
                    file,
                    tracker.downloadRequestIds[index],
                    (bytes) => tracker.reportProgress(bytes)
                );
                results[index] = { status: "fulfilled", value: { file, result } };
            } catch (reason) {
                results[index] = { status: "rejected", reason };
            }
        });
    });

    await queue.drain();
    console.log(results);
    return results;
}
