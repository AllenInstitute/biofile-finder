import FileService, { AnnotationNameToValuesMap, SelectionAggregationResult } from ".";
import { DownloadResolution, DownloadResult } from "../FileDownloadService";
import FileDetail from "../../entity/FileDetail";

export default class FileServiceNoop implements FileService {
    public getCountOfMatchingFiles(): Promise<number> {
        return Promise.resolve(0);
    }

    public getAggregateInformation(): Promise<SelectionAggregationResult> {
        return Promise.resolve({ count: 0, size: 0 });
    }

    public getEditableFileMetadata(): Promise<{ [fileId: string]: AnnotationNameToValuesMap }> {
        return Promise.resolve({});
    }

    public getFiles(): Promise<FileDetail[]> {
        return Promise.resolve([]);
    }

    public download(): Promise<DownloadResult> {
        return Promise.resolve({ downloadRequestId: "", resolution: DownloadResolution.CANCELLED });
    }

    public editFile(): Promise<void> {
        return Promise.resolve();
    }
}
