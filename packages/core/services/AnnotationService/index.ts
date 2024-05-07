import Annotation from "../../entity/Annotation";
import FileFilter from "../../entity/FileFilter";

export type AnnotationValue = string | number | boolean | Date;

export default interface AnnotationService {
    fetchValues(annotation: string): Promise<AnnotationValue[]>;
    fetchAnnotations(): Promise<Annotation[]>;
    fetchRootHierarchyValues(hierarchy: string[], filters: FileFilter[]): Promise<string[]>;
    fetchHierarchyValuesUnderPath(
        hierarchy: string[],
        path: string[],
        filters: FileFilter[]
    ): Promise<string[]>;
    fetchAvailableAnnotationsForHierarchy(annotations: string[]): Promise<string[]>;
}
