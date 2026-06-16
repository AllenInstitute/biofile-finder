import { isEmpty, isNil, isObject, sortBy } from "lodash";

import AnnotationName from "./AnnotationName";
import getFormatter, { AnnotationFormatter, AnnotationType } from "../AnnotationFormatter";
import FileDetail from "../FileDetail";
import defaultPathIsArray from "../pathIsArray";

export type AnnotationValue = string | number | boolean | Date;

/**
 * Expected JSON structure of an annotation given to this entity's constructor.
 */
export interface AnnotationResponse {
    /**
     * The path segments describing this annotation's position in the hierarchy.
     * For a nested sub-field like "Well.Dose.Unit", path = ["Well", "Dose", "Unit"].
     * For a flat annotation like "Gene", path = ["Gene"].
     * When path.length > 1, path[0] is the parent column (nestedParent).
     */
    annotationName: string | string[];
    description: string;
    type: AnnotationType;
    isImmutable?: boolean;
    units?: string;

    /**
     * For sub-field annotations, indicates which non-leaf path segments are arrays (STRUCT[]).
     * Length equals path.length - 1. For example, for path ["Well", "Dose", "Unit"]:
     *   pathIsArray[0] = true means "Well" is STRUCT[] (root array)
     *   pathIsArray[1] = true means "Dose" is STRUCT[] (intermediate array)
     * If undefined, defaults to [true, false, false, ...] (root is array, rest are scalars).
     */
    pathIsArray?: boolean[];

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

    /**
     * The full path of this annotation, including parent annotation(s) for nested annotations. For example:
     * - For a flat annotation like "Gene", path = ["Gene"].
     * - For a nested sub-field like "Well.Dose.Unit", path = ["Well", "Dose", "Unit"].
     */
    public readonly path: string[];
    public readonly name: string;
    public readonly displayName: string;
    public readonly description: string;
    public readonly type: AnnotationType;
    public readonly units: string | undefined;
    public readonly id: number | undefined;
    /**
     * Which non-leaf path segments are arrays (STRUCT[]). Length = path.length - 1.
     * Defaults to [true, false, ...] if not provided (root is array, rest are scalar structs).
     */
    public readonly pathIsArray: boolean[];

    /**
     * Whether or not this annotation is immutable. Immutable annotations are not expected to change
     * over time, and are not expected to be updated by the user. Examples include file size, file
     * name, file path, etc. Mutable annotations are expected to be updated by the user, and can
     * change over time. Examples include Gene, Cell Line, Program, etc.
     */
    public readonly isImmutable: boolean;

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
        this.path = Array.isArray(annotation.annotationName)
            ? annotation.annotationName
            : annotation.annotationName.split(".");
        this.name = this.path.join(".");
        this.displayName = annotation.annotationDisplayName || this.name;
        this.description = annotation.description;
        this.type = annotation.type;
        this.units = annotation.units;
        this.isImmutable = annotation.isImmutable || false;
        this.id = annotation.annotationId;
        // `annotation.pathIsArray` is the authoritative, schema-derived value
        // (DatabaseService.parseStructFields). defaultPathIsArray is only a fallback.
        this.pathIsArray = annotation.pathIsArray ?? defaultPathIsArray(this.path);
    }

    public get formatter(): AnnotationFormatter {
        return getFormatter(this.type);
    }

    // Whether this annotations represents a value that can be treated as Markdown
    public get isMarkdown(): boolean {
        return this.type === AnnotationType.MARKDOWN;
    }

    // Whether this annotation represents an open file link (ex. www.example.com)
    public get isOpenFileLink(): boolean {
        return this.type === AnnotationType.OPEN_FILE_LINK;
    }

    // Whether this annotation represents a nested/STRUCT column (the parent itself)
    public get isParent(): boolean {
        return this.type === AnnotationType.NESTED;
    }

    // Whether this is a virtual sub-field annotation derived from a nested parent
    public get isSubField(): boolean {
        return this.path.length > 1;
    }

    // The parent column name for a nested sub-field annotation (e.g. "Well" for path ["Well","Gene"])
    public get parents(): string[] | undefined {
        if (this.path.length <= 1) return undefined;
        return this.path.slice(0, -1);
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
        // Use the full path so FileDetail can traverse nested STRUCT columns.
        // For flat annotations path = ["Gene"], for sub-fields path = ["Well","Column"].
        const values = file.getAnnotation(this.path);
        if (isNil(values) || isEmpty(values)) {
            return Annotation.MISSING_VALUE;
        }

        // Nested parent annotations (the STRUCT column itself, not a leaf sub-field):
        // show entry count rather than trying to stringify the whole object.
        if (isObject(values[0])) {
            return `${values.length} ${values.length === 1 ? "entry" : "entries"}`;
        }

        return this.joinValuesForDisplay(values as AnnotationValue[]);
    }

    /**
     * Given a value, return the result of running it through this annotation's formatter.
     */
    public getDisplayValue(value: AnnotationValue): string {
        return this.formatter.displayValue(value, this.units);
    }

    public joinValuesForDisplay(values: AnnotationValue[]): string {
        return values.map((value) => this.getDisplayValue(value)).join(Annotation.SEPARATOR);
    }
}
