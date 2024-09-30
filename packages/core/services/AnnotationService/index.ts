import Annotation from "../../entity/Annotation";
import FileFilter from "../../entity/FileFilter";
import ExcludeFilter from "../../entity/FileFilter/ExcludeFilter";
import FuzzyFilter from "../../entity/FileFilter/FuzzyFilter";
import IncludeFilter from "../../entity/FileFilter/IncludeFilter";

export type AnnotationValue = string | number | boolean | Date;

export default interface AnnotationService {
    fetchValues(annotation: string): Promise<AnnotationValue[]>;
    fetchAnnotations(): Promise<Annotation[]>;
    fetchRootHierarchyValues(
        hierarchy: string[],
        filters: FileFilter[],
        fuzzyFilters?: FuzzyFilter[],
        excludeFilters?: ExcludeFilter[],
        includeFilters?: IncludeFilter[]
    ): Promise<string[]>;
    fetchHierarchyValuesUnderPath(
        hierarchy: string[],
        path: string[],
        filters: FileFilter[],
        fuzzyFilters?: FuzzyFilter[],
        excludeFilters?: ExcludeFilter[],
        includeFilters?: IncludeFilter[]
    ): Promise<string[]>;
    fetchAvailableAnnotationsForHierarchy(annotations: string[]): Promise<string[]>;
}
