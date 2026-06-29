import Annotation, { AnnotationResponseMms, AnnotationValue } from "../../entity/Annotation";
import { AnnotationType } from "../../entity/AnnotationFormatter";
import FileFilter from "../../entity/FileFilter";

export interface AnnotationDetails {
    type: AnnotationType;
    dropdownOptions?: string[];
}

export default interface AnnotationService {
    createAnnotation(
        annotation: Annotation,
        annotationOptions?: string[],
        user?: string
    ): Promise<AnnotationResponseMms[] | void>;
    fetchValues(annotation: string): Promise<AnnotationValue[]>;
    fetchAnnotations(): Promise<Annotation[]>;
    fetchAnnotationDetails(name: string): Promise<AnnotationDetails>;
    fetchRootHierarchyValues(hierarchy: string[], filters: FileFilter[]): Promise<string[]>;
    fetchHierarchyValuesUnderPath(
        hierarchy: string[],
        path: string[],
        filters: FileFilter[]
    ): Promise<string[]>;
    fetchAvailableAnnotationsForHierarchy(annotations: string[]): Promise<string[] | null>;
    fetchOptimalWidthForAnnotations(
        annotations: Annotation[],
        ignoreWidthLimit?: boolean
    ): Promise<Map<string, number>>;
    validateAnnotationValues(name: string, values: AnnotationValue[]): Promise<boolean>;
}
