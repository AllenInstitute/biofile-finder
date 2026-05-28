import { get as _get, isObject, sortBy } from "lodash";

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
     * Used for JSON VARCHAR columns.
     */
    nestedJsonPath?: string;
    /**
     * DuckDB list expression for extracting all values of this sub-field from a native
     * STRUCT[] column using list_transform / flatten.
     * E.g. `list_transform("Well", x -> x."Gene")` or
     * `flatten(list_transform("Well", x -> list_transform(x."Dose", y -> y."Value")))`.
     * Preferred over nestedJsonPath when available — avoids JSON parsing overhead.
     */
    nestedListExpression?: string;
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

    /**
     * DuckDB list expression for extracting values from a native STRUCT[] column.
     * Preferred over nestedJsonPath when available.
     */
    public get nestedListExpression(): string | undefined {
        return this.annotation.nestedListExpression;
    }

    public get units(): string | undefined {
        return this.annotation.units;
    }

    public get id(): number | undefined {
        return this.annotation.annotationId;
    }

    /**
     * Given a FileDetail, extract the value(s) of this annotation from that file and return a string
     * suitable for display in the UI. Handles missing values and nested annotations gracefully.
     *
     * E.g., given an FmsFile that looks like:
     *  const fmsFile = { "file_size": 50 }
     *  const fileSizeAnnotation = new Annotation({ annotation_name: "file_size", ... }, numberFormatter);
     *  const displayValue = fileSizeAnnotation.extractFromFile(fmsFile); // ~= "50B"
     */
    public extractFromFile(file: FileDetail): string {
        const values = file.getAnnotation(this.name);
        if (values === undefined || values === null || values.length < 1) {
            return Annotation.MISSING_VALUE;
        }

        // Nested annotations are plain objects, so if we check for that
        // we can display a special value for them instead of trying to display the object itself
        if (isObject(values[0])) {
            // For nested annotations, we want to show the number of entries
            // in the nested object rather than trying to display the object itself
            return `${values.length} ${values.length === 1 ? "entry" : "entries"}`;
        }

        return this.joinValuesForDisplay(values as AnnotationValue[]);
    }

    /**
     * Given a value, return the result of running it through this annotation's formatter.
     */
    public getDisplayValue(value: AnnotationValue): string {
        return this.formatter.displayValue(value, this.annotation.units);
    }

    public joinValuesForDisplay(values: AnnotationValue[]): string {
        return values
            .map((value) => this.getDisplayValue(value))
            .join(Annotation.SEPARATOR);
    }

    /**
     * Given a value expected to belong to this annotation, return the result of coercing, if necessary,
     * that value to accord with this annotation's type.
     */
    public valueOf(value: any): AnnotationValue {
        return this.formatter.valueOf(value);
    }
}
