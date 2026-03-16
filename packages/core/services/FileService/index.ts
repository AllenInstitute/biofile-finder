import { AnnotationValue } from "../AnnotationService";
import { DownloadResult } from "../FileDownloadService";
import Annotation from "../../entity/Annotation";
import FileDetail from "../../entity/FileDetail";
import FileSelection from "../../entity/FileSelection";
import FileSet from "../../entity/FileSet";
import { JSONReadyRange } from "../../entity/NumericRange";

type FmsFileAnnotationValue = string | number | boolean;
/**
 * A value within a nested annotation column. Can be a primitive or another
 * nested object to arbitrary depth — matching the structure of VARCHAR JSON
 * columns in a parquet file whose per-row content can vary freely.
 */
export type NestedAnnotationValue = FmsFileAnnotationValue | null | NestedAnnotation;
export interface NestedAnnotation {
    [key: string]: NestedAnnotationValue;
}
/**
 * Represents a sub-document that can be found within an FmsFile's `annotations` list.
 */
export interface FmsFileAnnotation {
    [key: string]: any;
    name: string;
    values: FmsFileAnnotationValue[];
    /** Populated for columns whose value is (or parses as) a JSON object. */
    nestedValues?: NestedAnnotation;
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
    fuzzy?: string[];
    exclude?: string[];
    include?: string[];
}

export interface AnnotationNameToValuesMap {
    [name: string]: AnnotationValue[];
}

export default interface FileService {
    fileExplorerServiceBaseUrl?: string;
    download(
        annotations: string[],
        selections: Selection[],
        format: "csv" | "json" | "parquet"
    ): Promise<DownloadResult>;
    getManifest(
        annotations: string[],
        selections: Selection[],
        format: "csv" | "json" | "parquet"
    ): Promise<File>;
    editFile(
        fileId: string,
        annotations: AnnotationNameToValuesMap,
        annotationNameToAnnotationMap?: Record<string, Annotation>,
        user?: string
    ): Promise<void>;
    getAggregateInformation(fileSelection: FileSelection): Promise<SelectionAggregationResult>;
    getCountOfMatchingFiles(fileSet: FileSet): Promise<number>;
    getFiles(request: GetFilesRequest): Promise<FileDetail[]>;
}
