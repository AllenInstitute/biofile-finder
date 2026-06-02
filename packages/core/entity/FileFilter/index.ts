import SQLBuilder from "../SQLBuilder";
import { AnnotationType } from "../AnnotationFormatter";
import { NO_VALUE_NODE } from "../../components/DirectoryTree/directory-hierarchy-state";

export interface FileFilterJson {
    path: string[];
    value: any;
    type?: FilterType;
    valueType?: AnnotationType;
    pathIsArray?: boolean[];
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
    public readonly value: any;
    public type: FilterType;
    public readonly valueType?: AnnotationType;
    /**
     * Which non-leaf path segments are arrays (STRUCT[]). Length = path.length - 1.
     * Defaults to [true, false, ...] (root is array, rest are scalar structs).
     */
    public readonly pathIsArray: boolean[];
    public static readonly FILTER_PATH_SEPARATOR = ",";

    public static isFileFilter(candidate: any): candidate is FileFilter {
        return candidate instanceof FileFilter;
    }

    // TODO: Stop accepting string - this is just to avoid too many line changes at once
    constructor(
        path: string | string[],
        annotationValue: any,
        type: FilterType = FilterType.DEFAULT,
        valueType?: AnnotationType,
        pathIsArray?: boolean[]
    ) {
        this.path = Array.isArray(path) ? path : [path];
        this.value = annotationValue;
        this.type = annotationValue === NO_VALUE_NODE ? FilterType.EXCLUDE : type;
        // This and pathisarray will be removed in the future
        // however in the meantime this default pathIsArray logic is worrisome unfortunately
        this.valueType = valueType;
        this.pathIsArray = pathIsArray ??
            Array.from({ length: Math.max(0, this.path.length - 1) }, (_, i) => i === 0);
    }

    // TODO: Remove or replace when we stop using dot notation
    // Also, "name" is a misnomer at this point since it may not be display-friendly, should be "key" or something
    public get name(): string {
        return this.path.join(".");
    }

    /**
     * Derive the DuckDB list expression from the path, correctly handling intermediate arrays.
     * Uses SQLBuilder.buildNestedAccessExpression for the actual generation.
     */
    private get nestedListExpression(): string | undefined {
        if (this.path.length <= 1) return undefined;
        return SQLBuilder.buildNestedAccessExpression(this.path, this.pathIsArray);
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
                return `${name}=${this.value}&fuzzy=${name}`;
        }
        return `${name}=${this.value}`;
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
                    return SQLBuilder.listContains(listExpr, this.value);
                default: {
                    // Type-aware nested filtering: check if any element in the list matches
                    const rangeMatch = String(this.value).match(/^RANGE\((.+),\s*(.+)\)$/);
                    if (rangeMatch) {
                        const [, min, max] = rangeMatch;
                        if (this.valueType === AnnotationType.NUMBER) {
                            return `len(list_filter(${listExpr}, __el -> CAST(__el AS DOUBLE) >= ${min} AND CAST(__el AS DOUBLE) < ${max})) > 0`;
                        }
                        if (this.valueType === AnnotationType.DATETIME || this.valueType === AnnotationType.DATE) {
                            return `len(list_filter(${listExpr}, __el -> CAST(__el AS TIMESTAMPTZ) >= CAST('${min}' AS TIMESTAMPTZ) AND CAST(__el AS TIMESTAMPTZ) < CAST('${max}' AS TIMESTAMPTZ))) > 0`;
                        }
                    }
                    if (this.valueType === AnnotationType.BOOLEAN) {
                        return `list_has(${listExpr}, ${this.value})`;
                    }
                    if (this.valueType === AnnotationType.DURATION) {
                        return `len(list_filter(${listExpr}, __el -> EXTRACT(epoch FROM __el)::BIGINT * 1000 = ${this.value})) > 0`;
                    }
                    return SQLBuilder.listContains(listExpr, this.value);
                }
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
                return SQLBuilder.regexMatchValueInList(columnName, this.value);
            default: {
                // Type-aware SQL generation
                if (this.valueType === AnnotationType.BOOLEAN) {
                    return `"${columnName}" = ${this.value}`;
                }
                const rangeMatch = String(this.value).match(/^RANGE\((.+),\s*(.+)\)$/);
                if (rangeMatch) {
                    const [, min, max] = rangeMatch;
                    if (this.valueType === AnnotationType.NUMBER) {
                        return `CAST("${columnName}" AS DOUBLE) >= ${min} AND CAST("${columnName}" AS DOUBLE) < ${max}`;
                    }
                    if (this.valueType === AnnotationType.DATETIME || this.valueType === AnnotationType.DATE) {
                        return `CAST("${columnName}" AS TIMESTAMPTZ) >= CAST('${min}' AS TIMESTAMPTZ) AND CAST("${columnName}" AS TIMESTAMPTZ) < CAST('${max}' AS TIMESTAMPTZ)`;
                    }
                }
                if (this.valueType === AnnotationType.DURATION) {
                    return `EXTRACT(epoch FROM "${columnName}")::BIGINT * 1000 = ${this.value}`;
                }
                return SQLBuilder.regexMatchValueInList(columnName, this.value);
            }
        }
    }

    public toJSON(): FileFilterJson {
        return {
            path: this.path,
            value: this.value,
            type: this.type,
            valueType: this.valueType,
            pathIsArray: this.pathIsArray,
        };
    }

    public equals(target: FileFilter): boolean {
        return (
            JSON.stringify(this.path) === JSON.stringify(target.path) &&
            this.value === target.value &&
            this.type === target.type
        );
    }

    /**
     * Generate a correlated WHERE clause for multiple sub-field filters that share the
     * same nested parent. Ensures ALL conditions are satisfied within the SAME array element.
     *
     * For example, given filters on ["Items","Color"]="blue" and ["Items","Size"]="Large":
     *   len(list_filter("Items", __elem -> CAST(__elem."Color" AS VARCHAR) = 'blue'
     *       AND CAST(__elem."Size" AS VARCHAR) = 'Large')) > 0
     *
     * Filters that use ANY/EXCLUDE/FUZZY or target different root parents should NOT be
     * passed here — they should continue using independent toSQLWhereString() calls.
     *
     * @param filters Array of filters that all share the same root parent (path[0]).
     *               Only DEFAULT-type filters with path.length > 1 are correlated;
     *               others are emitted independently.
     */
    public static toCorrelatedSQLWhereString(filters: FileFilter[]): string {
        if (filters.length === 0) return "1=1";

        // Separate filters into those that can be correlated and those that can't
        const correlatable: FileFilter[] = [];
        const independent: FileFilter[] = [];
        for (const f of filters) {
            if (f.path.length > 1 && f.type === FilterType.DEFAULT) {
                correlatable.push(f);
            } else {
                independent.push(f);
            }
        }

        const clauses: string[] = [];

        // Independent filters emit normally (OR'd within their own group if same name)
        if (independent.length > 0) {
            clauses.push(independent.map((f) => f.toSQLWhereString()).join(" OR "));
        }

        if (correlatable.length > 0) {
            // Group correlatable filters by their specific sub-field (name) so multiple
            // values for the same sub-field are OR'd, but different sub-fields are AND'd
            const bySubField = new Map<string, FileFilter[]>();
            for (const f of correlatable) {
                const key = f.name;
                if (!bySubField.has(key)) bySubField.set(key, []);
                bySubField.get(key)!.push(f);
            }

            const parent = correlatable[0].path[0];
            const lambdaVar = "__elem";

            // Build one lambda condition per sub-field group
            const lambdaConditions: string[] = [];
            for (const [, subFieldFilters] of bySubField) {
                // All filters in this group share the same path, just different values — OR them
                const fieldConditions = subFieldFilters.map((f) => {
                    const fieldParts = f.path.slice(1);
                    const fieldAccess = `${lambdaVar}.${fieldParts.map((p) => `"${p}"`).join(".")}`;
                    return FileFilter.buildElementCondition(fieldAccess, f);
                });
                if (fieldConditions.length === 1) {
                    lambdaConditions.push(fieldConditions[0]);
                } else {
                    lambdaConditions.push(`(${fieldConditions.join(" OR ")})`);
                }
            }

            const lambda = lambdaConditions.join(" AND ");
            clauses.push(`len(list_filter("${parent}", ${lambdaVar} -> ${lambda})) > 0`);
        }

        return clauses.join(" AND ");
    }

    /**
     * Build a single condition expression for testing one filter against an element variable
     * inside a list_filter lambda. Handles type-aware comparisons.
     */
    private static buildElementCondition(fieldAccess: string, filter: FileFilter): string {
        const escaped = `${filter.value}`.replaceAll("'", "''");

        const rangeMatch = String(filter.value).match(/^RANGE\((.+),\s*(.+)\)$/);
        if (rangeMatch) {
            const [, min, max] = rangeMatch;
            if (filter.valueType === AnnotationType.NUMBER) {
                return `CAST(${fieldAccess} AS DOUBLE) >= ${min} AND CAST(${fieldAccess} AS DOUBLE) < ${max}`;
            }
            if (filter.valueType === AnnotationType.DATETIME || filter.valueType === AnnotationType.DATE) {
                return `CAST(${fieldAccess} AS TIMESTAMPTZ) >= CAST('${min}' AS TIMESTAMPTZ) AND CAST(${fieldAccess} AS TIMESTAMPTZ) < CAST('${max}' AS TIMESTAMPTZ)`;
            }
        }
        if (filter.valueType === AnnotationType.BOOLEAN) {
            return `${fieldAccess} = ${filter.value}`;
        }
        if (filter.valueType === AnnotationType.DURATION) {
            return `EXTRACT(epoch FROM ${fieldAccess})::BIGINT * 1000 = ${filter.value}`;
        }
        // Default: cast to VARCHAR and compare
        return `CAST(${fieldAccess} AS VARCHAR) = '${escaped}'`;
    }
}
