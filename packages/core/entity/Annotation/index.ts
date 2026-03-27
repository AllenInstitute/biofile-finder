import { get as _get, sortBy } from "lodash";

import AnnotationName from "./AnnotationName";
import annotationFormatterFactory, {
    AnnotationFormatter,
    AnnotationType,
} from "../AnnotationFormatter";
import FileDetail from "../FileDetail";
import { AnnotationValue } from "../../services/AnnotationService";

/**
 * Expected JSON structure of an annotation returned from the query service.
 */
export interface AnnotationResponse {
    // Undefined when pulled from a non-AICS FMS data source
    annotationId?: number;
    annotationDisplayName: string;
    annotationName: string;
    description: string;
    isImmutable?: boolean;
    /** True when this column stores a nested object (parquet STRUCT/MAP or JSON VARCHAR). */
    isNested?: boolean;
    /**
     * True when this is a virtual annotation representing a specific sub-field path inside a
     * JSON VARCHAR column (e.g. "Well.Gene" inside the "Well" column).
     * When set, `nestedParent` and `nestedJsonPath` provide the SQL generation details.
     */
    isNestedSubField?: boolean;
    /** The top-level column name that contains this sub-field (e.g. "Well"). */
    nestedParent?: string;
    /**
     * Full DuckDB JSONPath expression for extracting all values of this sub-field from the
     * parent array column (e.g. "$[*].Gene" or "$[*].Dose[*].Value").
     */
    nestedJsonPath?: string;
    type: AnnotationType;
    units?: string;
}

/**
 * MMS queries return a different JSON structure than FES
 */
export interface AnnotationResponseMms {
    annotationId: number;
    annotationTypeId: number;
    description: "string";
    name: string;
}

/**
 * Representation of an annotation available for filtering, grouping, or sorting files from FMS.
 */
export default class Annotation {
    public static SEPARATOR = ", ";
    public static MISSING_VALUE = " -- ";

    private readonly annotation: AnnotationResponse;
    private readonly formatter: AnnotationFormatter;

    public static sort(annotations: Annotation[]): Annotation[] {
        // start by putting in alpha order
        const collator = new Intl.Collator("en");
        const sortedByDisplayName = [...annotations].sort((a, b) =>
            collator.compare(a.displayName, b.displayName)
        );

        // put an annotation from "TOP_LEVEL_ANNOTATIONS" ahead of the others
        return sortBy(sortedByDisplayName, (annotation) =>
            annotation.name === AnnotationName.FILE_NAME ? 0 : Number.POSITIVE_INFINITY
        );
    }

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

    public get type(): string | AnnotationType {
        return this.annotation.type;
    }

    public get isMarkdown(): boolean {
        return this.type === AnnotationType.MARKDOWN;
    }

    public get isOpenFileLink(): boolean {
        return this.type === AnnotationType.OPEN_FILE_LINK;
    }

    /**
     * Whether or not this annotation is immutable. Immutable annotations are not expected to change
     * over time, and are not expected to be updated by the user. Examples include file size, file
     * name, file path, etc. Mutable annotations are expected to be updated by the user, and can
     * change over time. Examples include Gene, Cell Line, Program, etc.
     */
    public get isImmutable(): boolean {
        return this.annotation.isImmutable || false;
    }

    /**
     * Whether this annotation stores a nested object (parquet STRUCT/MAP or a VARCHAR column
     * whose runtime values are JSON objects). Nested annotations have sub-field annotations
     * available as dotted-path names (e.g. "Well.Gene", "Well.Dose.Value") and can be
     * targeted for path-specific filtering at any depth.
     */
    public get isNested(): boolean {
        return this.annotation.isNested || false;
    }

    /**
     * Whether this is a virtual sub-field annotation (e.g. "Well.Gene") derived from sampling
     * the JSON values of a parent annotation. When true, SQL queries must use json_extract with
     * a wildcard over the dynamic top-level keys of the parent column.
     */
    public get isNestedSubField(): boolean {
        return this.annotation.isNestedSubField || false;
    }

    /** The parent column name for a virtual sub-field annotation (e.g. "Well" for "Well.Gene"). */
    public get nestedParent(): string | undefined {
        return this.annotation.nestedParent;
    }

    /**
     * Full DuckDB JSONPath expression for this virtual sub-field annotation.
     * E.g. "$[*].Gene" for "Well.Gene", or "$[*].Dose[*].Value" for "Well.Dose.Value".
     */
    public get nestedJsonPath(): string | undefined {
        return this.annotation.nestedJsonPath;
    }

    public get units(): string | undefined {
        return this.annotation.units;
    }

    public get id(): number | undefined {
        return this.annotation.annotationId;
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
     *  const displayValue = fileSizeAnnotation.extractFromFile(fmsFile); // ~= "50B"
     */
    public extractFromFile(file: FileDetail): string {
        let value: string | undefined | any[];

        if (file.details.hasOwnProperty(this.name)) {
            // "top-level" annotation
            value = _get(file.details, this.name, Annotation.MISSING_VALUE);
        } else {
            // part of the "annotations" list
            const correspondingAnnotation = file.getAnnotation(this.name);
            if (!correspondingAnnotation) {
                value = Annotation.MISSING_VALUE;
            } else {
                value = correspondingAnnotation.values;
            }
        }

        if (value === Annotation.MISSING_VALUE || value === null) {
            return Annotation.MISSING_VALUE;
        }

        if (Array.isArray(value)) {
            return value
                .map((val) => this.formatter.displayValue(val, this.annotation.units))
                .join(Annotation.SEPARATOR);
        }

        return this.formatter.displayValue(value, this.annotation.units);
    }

    /**
     * Given a value, return the result of running it through this annotation's formatter.
     */
    public getDisplayValue(value: AnnotationValue): string {
        return this.formatter.displayValue(value, this.annotation.units);
    }

    /**
     * Given a value expected to belong to this annotation, return the result of coercing, if necessary,
     * that value to accord with this annotation's type.
     */
    public valueOf(value: any): AnnotationValue {
        return this.formatter.valueOf(value);
    }
}
