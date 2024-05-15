import FileService, { SelectionAggregationResult } from ".";
import FileDetail from "../../entity/FileDetail";

export default class FileServiceNoop implements FileService {
    public async getCountOfMatchingFiles(): Promise<number> {
        return 0;
    }

    public async getAggregateInformation(): Promise<SelectionAggregationResult> {
        return { count: 0, size: 0 };
    }

    public async getFiles(): Promise<FileDetail[]> {
        return [];
    }
    
    public async getFilesAsBuffer(): Promise<Uint8Array> {
        return Promise.resolve(new Uint8Array());
    }
}
