import FileService, { FmsFile, SelectionAggregationResult } from ".";

export default class FileServiceNoop implements FileService {
    public async getCountOfMatchingFiles(): Promise<number> {
        return 0;
    }

    public async getAggregateInformation(): Promise<SelectionAggregationResult> {
        return { count: 0, size: 0 };
    }

    public async getFiles(): Promise<FmsFile[]> {
        return [];
    }
}
