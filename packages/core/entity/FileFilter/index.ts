import SQLBuilder from "../SQLBuilder";
import { NO_VALUE_NODE } from "../../components/DirectoryTree/directory-hierarchy-state";

export interface FileFilterJson {
    name: string;
    value: any;
    type?: FilterType;
    /**
     * For virtual sub-field annotations (e.g. "Well.Gene"), the parent column name ("Well")
     * and the DuckDB JSONPath expression (e.g. "$[*].Gene") used to build the WHERE clause.
     */
    nestedParent?: string;
    nestedJsonPath?: string;
    /** Native DuckDB list expression for STRUCT[] columns — preferred over nestedJsonPath. */
    nestedListExpression?: string;
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
    private readonly annotationName: string;
    private readonly annotationValue: any;
    private filterType: FilterType;
    /**
     * For virtual sub-field annotations (e.g. "Well.Gene"), the parent column name ("Well").
     * When set alongside `_nestedJsonPath`, `toSQLWhereString` targets the parent column
     * rather than treating `annotationName` as a physical column.
     */
    private readonly _nestedParent?: string;
    /**
     * Full DuckDB JSONPath expression for the sub-field within the parent column.
     * E.g. "$[*].Gene" for Well.Gene, or "$[*].Dose[*].Value" for Well.Dose.Value.
     */
    private readonly _nestedJsonPath?: string;
    /**
     * DuckDB list expression for native STRUCT[] columns.
     * When set, toSQLWhereString uses list_has / list_filter instead of json_extract.
     */
    private readonly _nestedListExpression?: string;

    public static isFileFilter(candidate: any): candidate is FileFilter {
        return candidate instanceof FileFilter;
    }

    constructor(
        annotationName: string,
        annotationValue: any,
        filterType: FilterType = FilterType.DEFAULT,
        nestedJsonPath?: string,
        nestedParent?: string,
        nestedListExpression?: string
    ) {
        this.annotationName = annotationName;
        this.annotationValue = annotationValue;
        this.filterType = annotationValue === NO_VALUE_NODE ? FilterType.EXCLUDE : filterType;
        this._nestedJsonPath = nestedJsonPath || undefined;
        this._nestedParent = nestedParent;
        this._nestedListExpression = nestedListExpression || undefined;
    }

    public get name() {
        return this.annotationName;
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

    /** The parent column name when this filter targets a virtual sub-field annotation. */
    public get nestedParent(): string | undefined {
        return this._nestedParent;
    }

    /** The DuckDB JSONPath expression for the sub-field (e.g. "$[*].Gene"). */
    public get nestedJsonPath(): string | undefined {
        return this._nestedJsonPath;
    }

    /** DuckDB list expression for native STRUCT[] columns. */
    public get nestedListExpression(): string | undefined {
        return this._nestedListExpression;
    }

    public toQueryString(): string {
        const pathSuffix = this._nestedJsonPath ? `[${this._nestedJsonPath}]` : "";
        switch (this.type) {
            case FilterType.ANY:
                return `include=${this.annotationName}${pathSuffix}`;
            case FilterType.EXCLUDE:
                return `exclude=${this.annotationName}${pathSuffix}`;
            case FilterType.FUZZY:
                if (this.value === "") return `fuzzy=${this.annotationName}${pathSuffix}`;
                return `${this.annotationName}${pathSuffix}=${this.annotationValue}&fuzzy=${this.annotationName}${pathSuffix}`;
        }
        return `${this.annotationName}${pathSuffix}=${this.annotationValue}`;
    }

    /** Unlike with FileSort, we shouldn't construct a new SQLBuilder since these will
     * be applied to a pre-existing SQLBuilder.
     * Instead, generate the string that can be passed into the .where() clause.
     */
    public toSQLWhereString(): string {
        // --- Native STRUCT[] sub-field (e.g. list_transform("Well", x -> x."Gene")) ---
        // Uses vectorized list operations — vastly faster than JSON parsing at scale.
        if (this._nestedListExpression) {
            const listExpr = this._nestedListExpression;
            switch (this.type) {
                case FilterType.ANY:
                    return `len(${listExpr}) > 0`;
                case FilterType.EXCLUDE:
                    return `("${this._nestedParent}" IS NULL OR len(${listExpr}) = 0)`;
                case FilterType.FUZZY:
                default:
                    return SQLBuilder.listContains(listExpr, this.annotationValue);
            }
        }

        // --- JSON VARCHAR sub-field fallback ---
        // `_nestedParent` is the physical column ("Well"); `_nestedJsonPath` is the full
        // DuckDB JSONPath expression ("$[*].Gene" or "$[*].Dose[*].Value").
        if (this._nestedParent && this._nestedJsonPath) {
            const col = this._nestedParent;
            const path = this._nestedJsonPath;
            switch (this.type) {
                case FilterType.ANY:
                    return `json_array_length(json_extract("${col}"::JSON, '${path}')) > 0`;
                case FilterType.EXCLUDE:
                    return `("${col}" IS NULL OR json_array_length(json_extract("${col}"::JSON, '${path}')) = 0)`;
                case FilterType.FUZZY:
                default:
                    return SQLBuilder.jsonArrayContains(
                        `json_extract("${col}"::JSON, '${path}')`,
                        this.annotationValue
                    );
            }
        }

        // --- Flat (whole-column) filter — existing behaviour ---
        switch (this.type) {
            case FilterType.ANY:
                return `"${this.annotationName}" IS NOT NULL`;
            case FilterType.EXCLUDE:
                return `"${this.annotationName}" IS NULL`;
            case FilterType.FUZZY:
            default:
                return SQLBuilder.regexMatchValueInList(this.annotationName, this.annotationValue);
        }
    }

    public toJSON(): FileFilterJson {
        return {
            name: this.annotationName,
            value: this.annotationValue,
            type: this.filterType,
            ...(this._nestedParent ? { nestedParent: this._nestedParent } : {}),
            ...(this._nestedJsonPath ? { nestedJsonPath: this._nestedJsonPath } : {}),
            ...(this._nestedListExpression
                ? { nestedListExpression: this._nestedListExpression }
                : {}),
        };
    }

    public equals(target: FileFilter): boolean {
        return (
            this.annotationName === target.annotationName &&
            this.annotationValue === target.annotationValue &&
            this.filterType === target.filterType &&
            (this._nestedParent ?? "") === (target.nestedParent ?? "") &&
            (this._nestedJsonPath ?? "") === (target.nestedJsonPath ?? "") &&
            (this._nestedListExpression ?? "") === (target.nestedListExpression ?? "")
        );
    }
}
