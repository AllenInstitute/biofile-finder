import { get as _get } from "lodash";

import annotationFormatterFactory, { AnnotationFormatter } from "../AnnotationFormatter";
import { FmsFile } from "../FileService";

/**
 * Expected JSON structure of an annotation returned from the query service.
 */
export interface AnnotationResponse {
    annotation_display_name: string;
    annotation_name: string;
    description: string;
    type: string;
    units?: string;
}

/**
 * Representation of an annotation available for filtering, grouping, or sorting files from FMS.
 */
export default class Annotation {
    public static MISSING_VALUE = "< MISSING >";

    private readonly annotation: AnnotationResponse;
    private readonly formatter: AnnotationFormatter;

    constructor(annotation: AnnotationResponse) {
        this.annotation = annotation;
        this.formatter = annotationFormatterFactory(this.annotation.type);
    }

    public get displayName(): string {
        return this.annotation.annotation_display_name;
    }

    public get name(): string {
        return this.annotation.annotation_name;
    }

    /**
     * Get the annotation this instance represents from a given FmsFile. E.g., given an FmsFile that looks like:
     *  const fmsFile = { "file_size": 5000000000 }
     *  const fileSizeAnnotation = new Annotation({ annotation_name: "file_size", ... }, numberFormatter);
     *  const displayValue = fileSizeAnnotation.getDisplayValue(fmsFile);
     */
    public getDisplayValue(file: FmsFile): string {
        const value = _get(file, this.annotation.annotation_name, Annotation.MISSING_VALUE);
        if (value === Annotation.MISSING_VALUE) {
            return value;
        }

        return this.formatter(value, this.annotation.units);
    }
}
