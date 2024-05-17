import FileService, { SelectionAggregationResult } from ".";
import { DownloadResolution, DownloadResult } from "../FileDownloadService";
import FileDetail from "../../entity/FileDetail";

export default class FileServiceNoop implements FileService {
    public getCountOfMatchingFiles(): Promise<number> {
        return Promise.resolve(0);
    }

    public getAggregateInformation(): Promise<SelectionAggregationResult> {
        return Promise.resolve({ count: 0, size: 0 });
    }

    public getFiles(): Promise<FileDetail[]> {
        return Promise.resolve([]);
    }

    public getFilesAsBuffer(): Promise<Uint8Array> {
        return Promise.resolve(new Uint8Array());
    }

    public download(): Promise<DownloadResult> {
        return Promise.resolve({ downloadRequestId: "", resolution: DownloadResolution.CANCELLED });
    }
}
