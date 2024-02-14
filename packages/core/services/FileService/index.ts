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

/**
 * Represents a document in the FMS MongoDb `files` collection (as returned by FES). It is extremely permissively typed to allow
 * for rapid iteration in the initial stages of this project.
 *
 * See https://aicsbitbucket.corp.alleninstitute.org/projects/SW/repos/mongo-schema-management/browse/mongo_schema_management/schema/file_explorer_v1/file.json for
 * the most up-to-date interface for this data structure.
 */
export interface FmsFile {
    [key: string]: any;
    annotations: FmsFileAnnotation[];
    file_id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    uploaded: string;
    thumbnail?: string;
}

export interface GetFilesRequest {
    from: number; // page offset
    limit: number; // size of page
    fileSet: FileSet; // file filters and applied sort order(s) in their query string form (e.g., "scientist=jane&sort=date-created(ASC)")
}

export interface SelectionAggregationResult {
    count: number;
    size: number;
}

export default interface FileService {
    baseUrl?: string;
    getCountOfMatchingFiles(fileSet: FileSet): Promise<number>;
    getAggregateInformation(fileSelection: FileSelection): Promise<SelectionAggregationResult>;
    getFiles(request: GetFilesRequest): Promise<FmsFile[]>;
}
