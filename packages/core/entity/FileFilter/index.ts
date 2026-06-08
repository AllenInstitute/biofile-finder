import { isEqual } from "lodash";

import SQLBuilder from "../SQLBuilder";
import { AnnotationType } from "../AnnotationFormatter";
import defaultPathIsArray from "../pathIsArray";
import { NO_VALUE_NODE } from "../../components/DirectoryTree/directory-hierarchy-state";

export interface FileFilterJson {
    path: string[];
    // TODO: Narrow this type to PrimitiveMetadataValue
    value: any;
    type?: FilterType;
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
    // TODO: Narrow this type to PrimitiveMetadataValue
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

    /**
     * Parse the RANGE(min, max) encoding produced by the number/date range pickers.
     * Returns sanitized min/max strings, or undefined when the value is not a range.
     * Centralized so the flat-column and nested-sub-field branches share one definition.
     *
     * Both min and max are validated to contain only characters safe for SQL literals
     * (digits, letters, hyphens, colons, dots, plus, T, Z — covering ISO-8601 dates and
     * numeric values). Any value that doesn't match is rejected (returns undefined) to
     * prevent SQL injection through crafted RANGE strings.
     */
    private static parseRangeBounds(value: any): { min: string; max: string } | undefined {
        const match = String(value).match(/^RANGE\((.+),\s*(.+)\)$/);
        if (!match) return undefined;
        const [, min, max] = match;
        // Allow only characters that appear in ISO-8601 timestamps and numeric values.
        const safe = /^[\w.+\-:TZ]+$/;
        if (!safe.test(min.trim()) || !safe.test(max.trim())) return undefined;
        return { min: min.trim(), max: max.trim() };
    }

    constructor(
        // TODO: Stop accepting string - this is just to avoid too many line changes at once
        path: string | string[],
        // TODO: Narrow this type to PrimitiveMetadataValue
        annotationValue: any,
        type: FilterType = FilterType.DEFAULT,
        valueType?: AnnotationType,
        pathIsArray?: boolean[]
    ) {
        this.path = Array.isArray(path) ? path : [path];
        this.value = annotationValue;
        this.type = annotationValue === NO_VALUE_NODE ? FilterType.EXCLUDE : type;
        this.valueType = valueType;
        // See defaultPathIsArray: schema-derived flags (Annotation.pathIsArray) are authoritative;
        // this default is only a fallback for paths lacking schema metadata.
        this.pathIsArray = pathIsArray ?? defaultPathIsArray(this.path);
    }

    // TODO: Remove or replace when we stop using dot notation
    // Also, "name" is a misnomer at this point since it may not be display-friendly, should be "key" or something
    public get name(): string {
        return this.path.join(".");
    }

    public toQueryString(): string {
        // Use the dotted name (not the JSON path array): this string is sent to the FES HTTP
        // API and used in FileSet cache keys, both of which expect `annotation=value` form.
        // URL-sharing serialization uses toJSON()/path instead.
        const name = this.name;
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
        if (this.path.length > 1) {
            // Guarded by path.length > 1, so the expression is always defined here.
            const listExpr = SQLBuilder.buildNestedAccessExpression(this.path, this.pathIsArray);
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
                    const range = FileFilter.parseRangeBounds(this.value);
                    if (range) {
                        const { min, max } = range;
                        if (this.valueType === AnnotationType.NUMBER) {
                            return SQLBuilder.listFilter(
                                listExpr,
                                "__el",
                                SQLBuilder.doubleRange("__el", min, max)
                            );
                        }
                        if (
                            this.valueType === AnnotationType.DATETIME ||
                            this.valueType === AnnotationType.DATE
                        ) {
                            return SQLBuilder.listFilter(
                                listExpr,
                                "__el",
                                SQLBuilder.timestampRange("__el", min, max)
                            );
                        }
                    }
                    if (this.valueType === AnnotationType.BOOLEAN) {
                        return `list_has(${listExpr}, ${this.value})`;
                    }
                    if (this.valueType === AnnotationType.NUMBER) {
                        // Cast the search value to DOUBLE and compare numerically.
                        // Avoids the CAST(2.0 AS VARCHAR)='2.0' vs '2' mismatch that
                        // occurs when floats are compared as strings.
                        return `list_has(${listExpr}, TRY_CAST('${this.value}' AS DOUBLE))`;
                    }
                    if (this.valueType === AnnotationType.DURATION) {
                        return SQLBuilder.listFilter(
                            listExpr,
                            "__el",
                            SQLBuilder.durationEquals("__el", this.value)
                        );
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
                const range = FileFilter.parseRangeBounds(this.value);
                if (range) {
                    const { min, max } = range;
                    if (this.valueType === AnnotationType.NUMBER) {
                        return SQLBuilder.doubleRange(`"${columnName}"`, min, max);
                    }
                    if (
                        this.valueType === AnnotationType.DATETIME ||
                        this.valueType === AnnotationType.DATE
                    ) {
                        return SQLBuilder.timestampRange(`"${columnName}"`, min, max);
                    }
                }
                if (this.valueType === AnnotationType.DURATION) {
                    return SQLBuilder.durationEquals(`"${columnName}"`, this.value);
                }
                return SQLBuilder.regexMatchValueInList(columnName, this.value);
            }
        }
    }

    public toJSON(): FileFilterJson {
        // Intentionally omit valueType and pathIsArray: they are derived from the data source's
        // annotation schema and recovered on load (metadata `receiveAnnotations` enrichment), so
        // serializing them would duplicate schema state in the URL and risk drift if the schema
        // changes. The data source is the single source of truth.
        return {
            path: this.path,
            value: this.value,
            type: this.type,
        };
    }

    public equals(target: FileFilter): boolean {
        return (
            isEqual(this.path, target.path) &&
            this.value === target.value &&
            this.type === target.type
        );
    }

    /**
     * Generate a correlated WHERE clause for multiple sub-field filters that share the
     * same nested parent. Ensures ALL conditions are satisfied within the SAME array element,
     * handling arbitrary nesting depth including intermediate STRUCT[] segments.
     *
     * Single-array example — ["Items","Color"]="blue" and ["Items","Size"]="Large":
     *   len(list_filter("Items", __e0 -> CAST(__e0."Color" AS VARCHAR) = 'blue'
     *       AND CAST(__e0."Size" AS VARCHAR) = 'Large')) > 0
     *
     * Double-array example — ["Well","Dose","Unit"]="uM" and ["Well","Color"]="blue"
     * where both Well and Dose are STRUCT[]:
     *   len(list_filter("Well", __e0 ->
     *       len(list_filter(__e0."Dose", __e1 -> CAST(__e1."Unit" AS VARCHAR) = 'uM')) > 0
     *       AND CAST(__e0."Color" AS VARCHAR) = 'blue')) > 0
     *
     * Filters that use ANY/EXCLUDE/FUZZY or target different root parents should NOT be
     * passed here — they should continue using independent toSQLWhereString() calls.
     *
     * @param filters Filters sharing the same root parent (path[0]). Only DEFAULT-type
     *               filters with path.length > 1 are correlated; others are emitted
     *               independently.
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
            const parent = correlatable[0].path[0];
            const innerConditions = FileFilter.buildCorrelatedConditions(correlatable, "__e0", 0);
            clauses.push(SQLBuilder.listFilter(`"${parent}"`, "__e0", innerConditions));
        }

        return clauses.join(" AND ");
    }

    /**
     * Recursively build the condition expression for a correlated list_filter lambda.
     *
     * `depth` tracks how many path segments have already been consumed by outer list_filter
     * expressions (depth 0 = inside the root list_filter). `elemVar` is the lambda variable
     * for the current array level (e.g. "__e0", "__e1").
     *
     * At each level:
     * - Leaf fields (next segment is the last): emit scalar conditions, OR same-field values.
     * - Intermediate scalar struct fields: continue dot-access in the condition expression.
     * - Intermediate STRUCT[] fields: emit a nested list_filter and recurse with depth+1.
     */
    private static buildCorrelatedConditions(
        filters: FileFilter[],
        elemVar: string,
        depth: number
    ): string {
        // Group filters by their next path segment (path[depth + 1])
        const byNextSegment = new Map<string, FileFilter[]>();
        for (const f of filters) {
            const nextSeg = f.path[depth + 1];
            const group = byNextSegment.get(nextSeg) ?? [];
            group.push(f);
            byNextSegment.set(nextSeg, group);
        }

        const conditions: string[] = [];
        for (const [segment, group] of byNextSegment) {
            const fieldAccess = `${elemVar}."${segment}"`;
            const atLeafLevel = group[0].path.length === depth + 2;

            if (atLeafLevel) {
                // Leaf: OR multiple values for the same field
                const leafConds = group.map((f) =>
                    FileFilter.buildElementCondition(fieldAccess, f)
                );
                conditions.push(
                    leafConds.length === 1 ? leafConds[0] : `(${leafConds.join(" OR ")})`
                );
            } else {
                // Intermediate segment — is it itself a STRUCT[]?
                const segIsArray = group[0].pathIsArray[depth + 1] === true;

                if (segIsArray) {
                    // Nested array: introduce another list_filter and recurse
                    const nextVar = `__e${depth + 1}`;
                    const innerCond = FileFilter.buildCorrelatedConditions(
                        group,
                        nextVar,
                        depth + 1
                    );
                    conditions.push(SQLBuilder.listFilter(fieldAccess, nextVar, innerCond));
                } else {
                    // Scalar struct: continue dot-access, group same final leaf for OR
                    const byLeafPath = new Map<string, FileFilter[]>();
                    for (const f of group) {
                        const leafKey = f.path.slice(depth + 2).join(".");
                        const g = byLeafPath.get(leafKey) ?? [];
                        g.push(f);
                        byLeafPath.set(leafKey, g);
                    }
                    for (const [, leafGroup] of byLeafPath) {
                        const leafParts = leafGroup[0].path.slice(depth + 1);
                        const fullAccess = `${elemVar}.${leafParts.map((p) => `"${p}"`).join(".")}`;
                        const leafConds = leafGroup.map((f) =>
                            FileFilter.buildElementCondition(fullAccess, f)
                        );
                        conditions.push(
                            leafConds.length === 1 ? leafConds[0] : `(${leafConds.join(" OR ")})`
                        );
                    }
                }
            }
        }

        return conditions.join(" AND ");
    }

    /**
     * Build a single condition expression for testing one filter against an element variable
     * inside a list_filter lambda. Handles type-aware comparisons.
     */
    private static buildElementCondition(fieldAccess: string, filter: FileFilter): string {
        const escaped = `${filter.value}`.replaceAll("'", "''");

        // Use the shared parseRangeBounds which validates min/max against an allowlist.
        const range = FileFilter.parseRangeBounds(filter.value);
        if (range) {
            const { min, max } = range;
            if (filter.valueType === AnnotationType.NUMBER) {
                return SQLBuilder.doubleRange(fieldAccess, min, max);
            }
            if (
                filter.valueType === AnnotationType.DATETIME ||
                filter.valueType === AnnotationType.DATE
            ) {
                return SQLBuilder.timestampRange(fieldAccess, min, max);
            }
        }
        if (filter.valueType === AnnotationType.BOOLEAN) {
            return `${fieldAccess} = ${filter.value}`;
        }
        if (filter.valueType === AnnotationType.NUMBER) {
            // Compare numerically to avoid CAST(2.0 AS VARCHAR)='2.0' vs '2' mismatch
            return `CAST(${fieldAccess} AS DOUBLE) = TRY_CAST('${escaped}' AS DOUBLE)`;
        }
        if (filter.valueType === AnnotationType.DURATION) {
            return SQLBuilder.durationEquals(fieldAccess, filter.value);
        }
        // If no explicit type but value is numeric, compare as DOUBLE to avoid float/string mismatch
        // (e.g. CAST(2.0 AS VARCHAR) = '2.0' ≠ '2' but CAST(2.0 AS DOUBLE) = 2.0 = TRY_CAST('2' AS DOUBLE))
        const asNum = Number(filter.value);
        if (!isNaN(asNum) && String(filter.value).trim() !== "") {
            return `CAST(${fieldAccess} AS DOUBLE) = TRY_CAST('${escaped}' AS DOUBLE)`;
        }
        // Default: cast to VARCHAR and compare
        return `CAST(${fieldAccess} AS VARCHAR) = '${escaped}'`;
    }
}
