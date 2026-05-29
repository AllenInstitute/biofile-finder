import SQLBuilder from "../SQLBuilder";
import { AnnotationType } from "../AnnotationFormatter";
import { NO_VALUE_NODE } from "../../components/DirectoryTree/directory-hierarchy-state";

export interface FileFilterJson {
    path: string[];
    value: any;
    type?: FilterType;
}

// Filter with formatted value
export interface Filter {
    name: string;
    value: any;
    displayValue: string;
}

// These also correspond to query param names
export enum FilterType {
    ANY = "include",
    EXCLUDE = "exclude",
    FUZZY = "fuzzy",
    DEFAULT = "default",
}

/**
 * Stub for a filter used to constrain a listing of files to those that match a particular condition. Should be
 * serializable to a URL query string-friendly format.
 */
export default class FileFilter {
    public readonly path: string[];
    private readonly annotationValue: any;
    private filterType: FilterType;
    private readonly annotationType?: AnnotationType;
    public static readonly FILTER_PATH_SEPARATOR = ",";

    public static isFileFilter(candidate: any): candidate is FileFilter {
        return candidate instanceof FileFilter;
    }

    // TODO: Stop accepting string - this is just to avoid too many line changes at once
    constructor(
        path: string | string[],
        annotationValue: any,
        filterType: FilterType = FilterType.DEFAULT,
        annotationType?: AnnotationType
    ) {
        this.path = Array.isArray(path) ? path : [path];
        this.annotationValue = annotationValue;
        this.filterType = annotationValue === NO_VALUE_NODE ? FilterType.EXCLUDE : filterType;
        this.annotationType = annotationType;
    }

    // TODO: Remove or replace when we stop using dot notation
    // Also, "name" is a misnomer at this point since it may not be display-friendly, should be "key" or something
    public get name(): string {
        return this.path.join(".");
    }

    public get value() {
        return this.annotationValue;
    }

    public get type() {
        return this.filterType;
    }

    public set type(filterType: FilterType) {
        this.filterType = filterType;
    }

    /** Whether this filter targets a nested sub-field annotation. */
    // public get isSubField(): boolean {
    //     return this.path.length > 1;
    // }

    /** The parent column name when this filter targets a virtual sub-field annotation. */
    // public get nestedParent(): string | undefined {
    //     return this.path.length > 1 ? this.path[0] : undefined;
    // }

    /**
     * Derive the DuckDB list expression from the path.
     * E.g. for path ["Well","Dose","Unit"] → list_transform("Well", x -> x."Dose"."Unit")
     */
    private get nestedListExpression(): string | undefined {
        if (this.path.length <= 1) return undefined;
        const parent = this.path[0];
        const fieldParts = this.path.slice(1);
        const accessChain = fieldParts.map((p) => `"${p}"`).join(".");
        // TODO: This can't be right - doesn't support layers of nesting beyond 1 sub-field, and also assumes the parent annotation is a STRUCT[] column
        return `list_transform("${parent}", x -> x.${accessChain})`;
    }

    public toQueryString(): string {
        const name = JSON.stringify(this.path);
        switch (this.type) {
            case FilterType.ANY:
                return `include=${name}`;
            case FilterType.EXCLUDE:
                return `exclude=${name}`;
            case FilterType.FUZZY:
                if (this.value === "") return `fuzzy=${name}`;
                return `${name}=${this.annotationValue}&fuzzy=${name}`;
        }
        return `${name}=${this.annotationValue}`;
    }

    /** Unlike with FileSort, we shouldn't construct a new SQLBuilder since these will
     * be applied to a pre-existing SQLBuilder.
     * Instead, generate the string that can be passed into the .where() clause.
     */
    public toSQLWhereString(): string {
        // --- Nested sub-field: derive list expression from path ---
        // TODO: Doesn't work with layers of nesting
        if (this.path.length > 1) {
            const listExpr = this.nestedListExpression!;
            const parent = this.path[0];
            switch (this.type) {
                case FilterType.ANY:
                    return `len(${listExpr}) > 0`;
                case FilterType.EXCLUDE:
                    return `("${parent}" IS NULL OR len(${listExpr}) = 0)`;
                case FilterType.FUZZY:
                default:
                    return SQLBuilder.listContains(listExpr, this.annotationValue);
            }
        }

        // --- Flat (whole-column) filter — existing behaviour ---
        const columnName = this.path[0];
        switch (this.type) {
            case FilterType.ANY:
                return `"${columnName}" IS NOT NULL`;
            case FilterType.EXCLUDE:
                return `"${columnName}" IS NULL`;
            case FilterType.FUZZY:
                return SQLBuilder.regexMatchValueInList(columnName, this.annotationValue);
            default: {
                // Type-aware SQL generation
                if (this.annotationType === AnnotationType.BOOLEAN) {
                    return `"${columnName}" = ${this.annotationValue}`;
                }
                const rangeMatch = String(this.annotationValue).match(/^RANGE\((.+),\s*(.+)\)$/);
                if (rangeMatch) {
                    const [, min, max] = rangeMatch;
                    if (this.annotationType === AnnotationType.NUMBER) {
                        return `CAST("${columnName}" AS DOUBLE) >= ${min} AND CAST("${columnName}" AS DOUBLE) < ${max}`;
                    }
                    if (this.annotationType === AnnotationType.DATETIME || this.annotationType === AnnotationType.DATE) {
                        return `CAST("${columnName}" AS TIMESTAMPTZ) >= CAST('${min}' AS TIMESTAMPTZ) AND CAST("${columnName}" AS TIMESTAMPTZ) < CAST('${max}' AS TIMESTAMPTZ)`;
                    }
                }
                if (this.annotationType === AnnotationType.DURATION) {
                    return `EXTRACT(epoch FROM "${columnName}")::BIGINT * 1000 = ${this.annotationValue}`;
                }
                return SQLBuilder.regexMatchValueInList(columnName, this.annotationValue);
            }
        }
    }

    public toJSON(): FileFilterJson {
        return {
            path: this.path,
            value: this.annotationValue,
            type: this.filterType,
        };
    }

    public equals(target: FileFilter): boolean {
        return (
            JSON.stringify(this.path) === JSON.stringify(target.path) &&
            this.annotationValue === target.annotationValue &&
            this.filterType === target.filterType
        );
    }
}
