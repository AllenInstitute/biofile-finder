import Annotation from "../../entity/Annotation";
import { AnnotationType } from "../../entity/AnnotationFormatter";
import FileFilter from "../../entity/FileFilter";

export type AnnotationValue = string | number | boolean | Date;

export interface AnnotationDetails {
    type: AnnotationType;
    dropdownOptions?: string[];
}

export default interface AnnotationService {
    fetchValues(annotation: string): Promise<AnnotationValue[]>;
    fetchAnnotations(): Promise<Annotation[]>;
    fetchAnnotationDetails(name: string): Promise<AnnotationDetails>;
    fetchRootHierarchyValues(hierarchy: string[], filters: FileFilter[]): Promise<string[]>;
    fetchHierarchyValuesUnderPath(
        hierarchy: string[],
        path: string[],
        filters: FileFilter[]
    ): Promise<string[]>;
    fetchAvailableAnnotationsForHierarchy(annotations: string[]): Promise<string[]>;
    validateAnnotationValues(name: string, values: AnnotationValue[]): Promise<boolean>;
}
