import { isEmpty, isNil, isObject, sortBy } from "lodash";

import AnnotationName from "./AnnotationName";
import getFormatter, { AnnotationFormatter, AnnotationType } from "../AnnotationFormatter";
import FileDetail from "../FileDetail";

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
     * For sub-field annotations, one flag per path segment (length === path.length):
     * pathIsArray[i] is true when path[i] is a list. For path ["Well", "Dose", "Unit"]:
     *   pathIsArray[0] = true  → "Well" is STRUCT[] (root array)
     *   pathIsArray[1] = true  → "Dose" is STRUCT[] (intermediate array)
     *   pathIsArray[2] = true  → "Unit" is itself a list (e.g. VARCHAR[]) — a list leaf
     * REQUIRED for nested annotations (path.length > 1) — the constructor throws if absent,
     * since guessing a sub-field's array-ness produces silently-wrong SQL. May be omitted for
     * flat annotations, where array-ness is never consulted during SQL generation.
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
     * Which non-leaf path segments are arrays (STRUCT[]). Length = path.length - 1
     */
    public readonly pathIsArray: boolean[];

    /**
     * Whether or not this annotation is immutable. Immutable annotations are not expected to change
     * over time, and are not expected to be updated by the user. Examples include file size, file
     * name, file path, etc. Mutable annotations are expected to be updated by the user, and can
     * change over time. Examples include Gene, Cell Line, Program, etc.
     */
    public readonly isImmutable: boolean;

    /**
     * Build the `name -> pathIsArray` lookup that SQL builders consume at generation time
     * (see resolvePathIsArray). Keyed by dotted annotation name. This is how the
     * authoritative, schema-derived nesting flags reach FileFilter/FileSort without those
     * entities storing (and having to keep in sync) their own copy.
     */
    public static pathIsArrayByName(annotations: Annotation[]): Map<string, boolean[]> {
        return new Map(annotations.map((annotation) => [annotation.name, annotation.pathIsArray]));
    }

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
        // pathIsArray (one boolean per path segment) is authoritative schema state from
        // DatabaseService.parseStructFields. A NESTED annotation MUST supply it: guessing a
        // sub-field's per-segment array-ness yields silently-wrong SQL (list ops against a
        // scalar struct, or scalar matching against a list), so refuse rather than default.
        // For a flat annotation array-ness is never consulted during SQL generation, so an
        // all-false placeholder is safe.
        if (this.path.length > 1 && annotation.pathIsArray === undefined) {
            throw new Error(
                `Annotation "${this.name}" is nested but was created without pathIsArray. ` +
                    `Provide one boolean per path segment (see DatabaseService.parseStructFields).`
            );
        }
        this.pathIsArray = annotation.pathIsArray ?? this.path.map(() => false);
    }

    public get leafDisplayName(): string {
        return this.displayName.split(".").slice(-1)[0];
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

    // Whether this annotation has any nested array (STRUCT[]) segments in its path. For example, for path ["Well", "Dose", "Unit"]:
    public get hasNestedArray(): boolean {
        return this.pathIsArray.some(Boolean);
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
