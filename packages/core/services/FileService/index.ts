import { DownloadResult } from "../FileDownloadService";
import Annotation, { AnnotationValue } from "../../entity/Annotation";
import FileDetail from "../../entity/FileDetail";
import FileFilter from "../../entity/FileFilter";
import FileSelection from "../../entity/FileSelection";
import FileSet from "../../entity/FileSet";
import FileSort from "../../entity/FileSort";
import { JSONReadyRange } from "../../entity/NumericRange";

export type PrimitiveMetadataValue = string | number | boolean;
/**
 * A value within a nested annotation entry. Can be a primitive, a nested object,
 * or an array of nested entries — supporting arrays-of-objects at any depth.
 */
// export type NestedAnnotationValue = FmsFileAnnotationValue | NestedAnnotation | NestedAnnotation[];
export type MetadataValue = PrimitiveMetadataValue[] | NestedMetadataValue[];
export interface NestedMetadataValue {
    [metadataKey: string]: MetadataValue;
}

// TODO: Remove this below interface type in favor of using the above schema
/**
 * Represents a sub-document that can be found within an FmsFile's `annotations` list.
 */
export interface FmsFileAnnotation {
    name: string;
    values: MetadataValue;
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
    filters: FileFilter[];
    indexRanges: JSONReadyRange[];
    sort?: FileSort;
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
        annotationNameToAnnotationMap?: Map<string, Annotation>,
        user?: string
    ): Promise<void>;
    getAggregateInformation(fileSelection: FileSelection): Promise<SelectionAggregationResult>;
    getCountOfMatchingFiles(fileSet: FileSet): Promise<number>;
    getFiles(request: GetFilesRequest): Promise<FileDetail[]>;
}
