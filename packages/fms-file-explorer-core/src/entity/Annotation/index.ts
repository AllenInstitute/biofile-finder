import { find, get as _get } from "lodash";

import annotationFormatterFactory, { AnnotationFormatter } from "../AnnotationFormatter";
import { AnnotationResponse } from "../../services/AnnotationService";
import { FmsFile, FmsFileAnnotation } from "../../services/FileService";

/**
 * Representation of an annotation available for filtering, grouping, or sorting files from FMS.
 */
export default class Annotation {
    public static SEPARATOR = ", ";
    public static MISSING_VALUE = "< MISSING >";

    private readonly annotation: AnnotationResponse;
    private readonly formatter: AnnotationFormatter;

    constructor(annotation: AnnotationResponse) {
        this.annotation = annotation;
        this.formatter = annotationFormatterFactory(this.annotation.type);
    }

    public get description(): string {
        return this.annotation.description;
    }

    public get displayName(): string {
        return this.annotation.annotationDisplayName;
    }

    public get name(): string {
        return this.annotation.annotationName;
    }

    public get values(): (string | number | boolean | Date)[] {
        return this.annotation.values;
    }

    /**
     * Get the annotation this instance represents from a given FmsFile. An annotation on an FmsFile
     * can either be at the "top-level" of the document or it can be within it's "annotations" list.
     * A "top-level" annotation is expected to be basic file info, like size, name, path on disk, etc.
     * An annotation within the "annotations" list can be absolutely anything--it conforms to the interface:
     * { annotation_name: str, values: any[] }.
     *
     *
     * E.g., given an FmsFile that looks like:
     *  const fmsFile = { "file_size": 50 }
     *  const fileSizeAnnotation = new Annotation({ annotation_name: "file_size", ... }, numberFormatter);
     *  const displayValue = fileSizeAnnotation.getDisplayValue(fmsFile); // ~= "50B"
     */
    public getDisplayValue(file: FmsFile): string {
        let value: string | undefined | any[];

        if (file.hasOwnProperty(this.name)) {
            // "top-level" annotation
            value = _get(file, this.name, Annotation.MISSING_VALUE);
        } else {
            // part of the "annotations" list
            const correspondingAnnotation = find<FmsFileAnnotation>(
                file.annotations,
                (annotation) => annotation.name === this.name
            );
            if (!correspondingAnnotation) {
                value = Annotation.MISSING_VALUE;
            } else {
                value = correspondingAnnotation.values;
            }
        }

        if (value === Annotation.MISSING_VALUE) {
            return value;
        }

        if (Array.isArray(value)) {
            return value
                .map((val) => this.formatter(val, this.annotation.units))
                .join(Annotation.SEPARATOR);
        }

        return this.formatter(value, this.annotation.units);
    }
}
