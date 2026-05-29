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
    /**
     * The path segments describing this annotation's position in the hierarchy.
     * For a nested sub-field like "Well.Dose.Unit", path = ["Well", "Dose", "Unit"].
     * For a flat annotation like "Gene", path = ["Gene"].
     * When path.length > 1, path[0] is the parent column (nestedParent).
     */
    path: string[];
    description: string;
    type: AnnotationType;
    isImmutable?: boolean;
    units?: string;

    // Undefined when pulled from a non-AICS FMS data source
    annotationId?: number;
    // Deprecated in favor of path
    annotationDisplayName?: string;
}

/**
 * MMS queries return a different JSON structure than FES
 */
export interface AnnotationResponseMms {
    annotationId: number;
    annotationTypeId: number;
    description: string;
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
        return this.annotation.annotationDisplayName || this.name;
    }

    public get name(): string {
        return this.annotation.path.slice(-1)[0];
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

    /** Whether this annotation represents a nested/STRUCT column (the parent itself). */
    public get isParent(): boolean {
        return this.annotation.type === AnnotationType.NESTED;
    }

    /** Whether this is a virtual sub-field annotation derived from a nested parent. */
    public get isSubField(): boolean {
        return this.annotation.path.length > 1;
    }

    /** The parent column name for a nested sub-field annotation (e.g. "Well" for path ["Well","Gene"]). */
    public get parents(): string[] | undefined {
        if (this.annotation.path.length <= 1) return undefined;
        return this.annotation.path.slice(0, -1);
    }

    /** The sub-field path parts within the parent (e.g. ["Dose","Unit"] for path ["Well","Dose","Unit"]). */
    public get nestedFieldParts(): string[] | undefined {
        if (this.annotation.path.length <= 1) return undefined;
        return this.annotation.path.slice(1);
    }

    // TODO: This can't be right...
    /** DuckDB JSONPath expression for this sub-field (e.g. "$[*].Dose.Unit"). */
    public get nestedJsonPath(): string | undefined {
        const parts = this.nestedFieldParts;
        if (!parts) return undefined;
        return `$[*].${parts.join(".")}`;
    }

    /**
     * DuckDB list expression for accessing this sub-field from a STRUCT[] column.
     * E.g. list_transform("Well", x -> x."Dose"."Unit")
     */
    public get nestedListExpression(): string | undefined {
        const parts = this.nestedFieldParts;
        if (!parts) return undefined;
        const accessChain = parts.map((p) => `"${p}"`).join(".");
        // TODO: This can't be right - doesn't support layers of nesting beyond 1 sub-field, and also assumes the parent annotation is a STRUCT[] column
        return `list_transform("${this.annotation.path[0]}", x -> x.${accessChain})`;
    }

    public get units(): string | undefined {
        return this.annotation.units;
    }

    /** The path array that identifies this annotation in the hierarchy. */
    public get path(): string[] {
        return this.annotation.path;
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
