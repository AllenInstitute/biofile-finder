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
    private _values: (string | number | boolean)[] = [];
    private _valuesLoaded: Promise<(string | number | boolean)[]> | undefined;

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
     * Return listing of all unique, possible values for this annotation across all usages of it in FMS.
     */
    public get values(): (string | number | boolean)[] {
        return this._values;
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
     * ! SIDE EFFECT !
     * Fetches values if they have not already been loaded.
     */
    public async loadValues() {
        if (this._valuesLoaded === undefined) {
            this._valuesLoaded = this.annotationService.fetchValues(
                this.annotation.annotation_name
            );
        }

        this._values = await this._valuesLoaded;
    }
}
