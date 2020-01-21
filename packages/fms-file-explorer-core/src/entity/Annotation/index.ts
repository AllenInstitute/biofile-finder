import { find, get as _get } from "lodash";

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
    private _values: (string | number | boolean)[] | undefined;

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
        let value: string | undefined | any[];

        if (file.hasOwnProperty(this.name)) {
            // "top-level" annotation
            value = _get(file, this.name, Annotation.MISSING_VALUE);
        } else {
            // part of the "annotations" list

            const correspondingAnnotation = find(
                _get(file, "annotations", []),
                (annotation) => annotation.annotation_name === this.name
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
            return value.map((val) => this.formatter(val, this.annotation.units)).join(", ");
        }

        return this.formatter(value, this.annotation.units);
    }

    /**
     * Return listing of all unique, possible values for this annotation across all usages of it in FMS.
     *
     * ! SIDE EFFECT !
     * Fetches values if they have not already been loaded.
     */
    public async fetchValues(): Promise<(string | number | boolean)[]> {
        if (this._values === undefined) {
            this._values = await this.annotationService.fetchValues(
                this.annotation.annotation_name
            );
        }

        return this._values;
    }
}
