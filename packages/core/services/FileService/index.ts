import FileDetail from "../../entity/FileDetail";
import FileSelection from "../../entity/FileSelection";
import FileSet from "../../entity/FileSet";

/**
 * Represents a sub-document that can be found within an FmsFile's `annotations` list.
 */
export interface FmsFileAnnotation {
    [key: string]: any;
    name: string;
    values: (string | number | boolean)[];
}

export interface GetFilesRequest {
    from: number; // page offset
    limit: number; // size of page
    fileSet: FileSet; // file filters and applied sort order(s) in their query string form (e.g., "scientist=jane&sort=date-created(ASC)")
}

export interface SelectionAggregationResult {
    count: number;
    size?: number;
}

export default interface FileService {
    baseUrl?: string;
    getCountOfMatchingFiles(fileSet: FileSet): Promise<number>;
    getAggregateInformation(fileSelection: FileSelection): Promise<SelectionAggregationResult>;
    getFiles(request: GetFilesRequest): Promise<FileDetail[]>;
}
