import { AnnotationValue } from "../AnnotationService";
import { DownloadResult } from "../FileDownloadService";
import Annotation from "../../entity/Annotation";
import FileDetail from "../../entity/FileDetail";
import FileSelection from "../../entity/FileSelection";
import FileSet from "../../entity/FileSet";
import { JSONReadyRange } from "../../entity/NumericRange";

type FmsFileAnnotationValue = string | number | boolean;
/**
 * A value within a nested annotation entry. Can be a primitive, a nested object,
 * or an array of nested entries — supporting arrays-of-objects at any depth.
 */
export type NestedAnnotationValue = FmsFileAnnotationValue | null | NestedAnnotation | NestedAnnotation[];
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
    /**
     * Populated for columns whose value is (or parses as) a JSON array of objects.
     * Each element is one entry in the array (e.g. one Well record).
     */
    nestedValues?: NestedAnnotation[];
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
