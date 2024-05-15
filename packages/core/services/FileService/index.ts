import FileDetail from "../../entity/FileDetail";
import FileSelection from "../../entity/FileSelection";
import FileSet from "../../entity/FileSet";
import { JSONReadyRange } from "../../entity/NumericRange";

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

export interface Selection {
    filters: {
        [index: string]: (string | number | boolean)[];
    };
    indexRanges: JSONReadyRange[];
    sort?: {
        annotationName: string;
        ascending: boolean;
    };
}

export default interface FileService {
    baseUrl?: string;
    getCountOfMatchingFiles(fileSet: FileSet): Promise<number>;
    getAggregateInformation(fileSelection: FileSelection): Promise<SelectionAggregationResult>;
    getFiles(request: GetFilesRequest): Promise<FileDetail[]>;
    getFilesAsBuffer(annotations: string[], selections: Selection[], format: "json" | "csv" | "parquet"): Promise<Uint8Array>;
}
