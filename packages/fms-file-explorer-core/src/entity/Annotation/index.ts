import { get as _get } from "lodash";

import annotationFormatterFactory, { AnnotationFormatter } from "../AnnotationFormatter";
import AnnotationService from "../../services/AnnotationService";
import { FmsFile } from "../../services/FileService";

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
    private readonly annotationService: AnnotationService;
    private readonly formatter: AnnotationFormatter;
    private values: Promise<(string | number | boolean)[]> | undefined;

    constructor(
        annotation: AnnotationResponse,
        annotationService: AnnotationService = new AnnotationService()
    ) {
        this.annotation = annotation;
        this.annotationService = annotationService;
        this.formatter = annotationFormatterFactory(this.annotation.type);
    }

    public get description(): string {
        return this.annotation.description;
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

    /**
     * Return listing of all unique, possible values for this annotation across all usages of it in FMS.
     *
     * ! SIDE EFFECT !
     * Fetches values if they have not already been loaded.
     */
    public async getValues(): Promise<(string | number | boolean)[]> {
        if (this.values === undefined) {
            this.values = this.annotationService.fetchValues(this.annotation.annotation_name);
        }

        try {
            return await this.values;
        } catch (e) {
            // TODO retry logic
            console.error(e);
            return [];
        }
    }
}
