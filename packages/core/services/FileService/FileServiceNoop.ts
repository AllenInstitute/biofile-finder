import FileService, { SelectionAggregationResult } from ".";
import { DownloadResolution, DownloadResult } from "../FileDownloadService";
import FileDetail from "../../entity/FileDetail";
import { CancellablePromise } from "../../entity/types";

export default class FileServiceNoop implements FileService {
    public readonly provenanceIdColumns = [""];
    public getCountOfMatchingFiles(): CancellablePromise<number> {
        return { promise: Promise.resolve(0) };
    }

    public hasMatchingFiles(): CancellablePromise<boolean> {
        return { promise: Promise.resolve(true) };
    }

    public getAggregateInformation(): Promise<SelectionAggregationResult> {
        return Promise.resolve({ count: 0, size: 0 });
    }

    public getFiles(): Promise<FileDetail[]> {
        return Promise.resolve([]);
    }

    public getFileByUid(): Promise<FileDetail | undefined> {
        return Promise.resolve(undefined);
    }

    public getManifest(): Promise<File> {
        return Promise.resolve(new File([], "manifest", { type: "text/csv" }));
    }

    public download(): Promise<DownloadResult> {
        return Promise.resolve({ downloadRequestId: "", resolution: DownloadResolution.CANCELLED });
    }

    public editFile(): Promise<void> {
        return Promise.resolve();
    }
}
