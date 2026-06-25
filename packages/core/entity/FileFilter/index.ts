import { isEqual } from "lodash";

import SQLBuilder from "../SQLBuilder";
import { AnnotationType } from "../AnnotationFormatter";
import resolvePathIsArray, { isLeafAnArray, hasArrayBeforeLeaf } from "../resolvePathIsArray";
import { NO_VALUE_NODE } from "../../components/DirectoryTree/directory-hierarchy-state";

export interface FileFilterJson {
    name: string;
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
    public readonly value: any;
    public type: FilterType;
    public readonly valueType?: AnnotationType;
    public static readonly FILTER_PATH_SEPARATOR = ",";

    public static isFileFilter(candidate: any): candidate is FileFilter {
        return candidate instanceof FileFilter;
    }

    /**
     * Convert any mix of filters into SQL WHERE clause strings, one per root column.
     * Returns a `string[]` so callers can pass the result directly to `SQLBuilder.where()`,
     * which AND-joins each element as its own clause.
     */
    public static toListOfWhereClauses(
        filters: FileFilter[],
        pathIsArrayByName: Map<string, boolean[]>
    ): string[] {
        const byRoot = new Map<string, FileFilter[]>();
        for (const f of filters) {
            const bucket = byRoot.get(f.path[0]) ?? [];
            bucket.push(f);
            byRoot.set(f.path[0], bucket);
        }

        const clauses: string[] = [];
        for (const [root, group] of byRoot) {
            const correlatable: FileFilter[] = [];
            const independent: FileFilter[] = [];
            for (const f of group) {
                const pathIsArray = resolvePathIsArray(f.name, f.path.length, pathIsArrayByName);
                const isNested = f.path.length > 1;
                const hasArray = hasArrayBeforeLeaf(pathIsArray);
                const hasValueAwareFilter = f.type === FilterType.DEFAULT;
                if (isNested && hasValueAwareFilter && hasArray) {
                    correlatable.push(f);
                } else {
                    independent.push(f);
                }
            }
            if (independent.length > 0) {
                clauses.push(
                    independent
                        .map((f) =>
                            f.toSimpleWhereClause(
                                resolvePathIsArray(f.name, f.path.length, pathIsArrayByName)
                            )
                        )
                        .join(" OR ")
                );
            }
            if (correlatable.length > 0) {
                const inner = FileFilter.buildNestedConditions(
                    correlatable,
                    "__e0",
                    0,
                    pathIsArrayByName
                );
                clauses.push(SQLBuilder.listFilter(`"${root}"`, "__e0", inner));
            }
        }
        return clauses;
    }

    constructor(
        annotationName: string | string[],
        // TODO: Narrow this type to PrimitiveMetadataValue
        value: any,
        type: FilterType = FilterType.DEFAULT,
        valueType?: AnnotationType
    ) {
        this.path = Array.isArray(annotationName) ? annotationName : annotationName.split(".");
        this.value = value;
        this.type = value === NO_VALUE_NODE ? FilterType.EXCLUDE : type;
        this.valueType = valueType;
    }

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

    /**
     * Generate the SQL condition string for this filter.
     *
     * For nested filters: generates conditions on the leaf field and correlates them with an EXISTS or list_filter over the root array, depending on the filter type.
     * For flat filters: generates a simple condition on the column, or an IS NULL / IS NOT NULL check for ANY/EXCLUDE.
     */
    public toSimpleWhereClause(pathIsArray: boolean[]): string {
        const isNested = this.path.length > 1;
        const columnExpr = SQLBuilder.buildNestedAccessExpression(this.path, pathIsArray);

        // If nested and an intermediate segment is an array, match by correlating with an inner query that filters the unnested root.
        if (isNested && hasArrayBeforeLeaf(pathIsArray)) {
            if (this.type === FilterType.ANY) return `len(${columnExpr}) > 0`;
            if (this.type === FilterType.EXCLUDE)
                return `("${this.path[0]}" IS NULL OR len(${columnExpr}) = 0)`;
            if (this.type === FilterType.FUZZY) {
                const boolList = SQLBuilder.buildNestedAccessExpression(
                    this.path,
                    pathIsArray,
                    (leaf) =>
                        isLeafAnArray(pathIsArray)
                            ? SQLBuilder.listRegexContains(leaf, this.value)
                            : SQLBuilder.regexContains(leaf, this.value)
                );
                return `list_has(${boolList}, true)`;
            }
            // Use the same list_filter approach as the correlated path so that the
            // condition is tested inside a single lambda, avoiding double list_transform.
            const inner = FileFilter.buildNestedConditions(
                [this],
                "__e0",
                0,
                new Map([[this.name, pathIsArray]])
            );
            return SQLBuilder.listFilter(`"${this.path[0]}"`, "__e0", inner);
        }

        // If nested and leaf is an array match by nested list filtering
        if (isNested && isLeafAnArray(pathIsArray)) {
            if (this.type === FilterType.ANY) return `len(${columnExpr}) > 0`;
            if (this.type === FilterType.EXCLUDE)
                return `("${this.path[0]}" IS NULL OR len(${columnExpr}) = 0)`;
            if (this.type === FilterType.FUZZY)
                return SQLBuilder.listRegexContains(columnExpr, this.value);
            return SQLBuilder.listContains(columnExpr, this.value);
        }

        // Otherwise, simplest case, match by a scalar condition on the column
        // (or an IS NULL / IS NOT NULL check for ANY/EXCLUDE)
        if (this.type === FilterType.ANY) return `${columnExpr} IS NOT NULL`;
        if (this.type === FilterType.EXCLUDE) return `${columnExpr} IS NULL`;
        if (this.type === FilterType.FUZZY) return SQLBuilder.regexContains(columnExpr, this.value);
        return SQLBuilder.matchByType(
            columnExpr,
            this.value,
            this.valueType ?? AnnotationType.STRING,
            isNested
        );
    }

    public toJSON(): FileFilterJson {
        // Intentionally omit valueType and pathIsArray: they are derived from the data source's
        // annotation schema and recovered on load (metadata `receiveAnnotations` enrichment), so
        // serializing them would duplicate schema state in the URL and risk drift if the schema
        // changes. The data source is the single source of truth.
        return {
            name: this.name,
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
     * Recursively builds the condition body for a list_filter lambda over a nested STRUCT[].
     *
     * `accessPrefix` is the DuckDB expression for the current element in the lambda scope:
     *   - At the root level it is the lambda variable, e.g. `__e0`.
     *   - After descending through a scalar-STRUCT segment it grows, e.g. `__e0."Dose"`.
     * `depth` is how many path segments outer list_filter lambdas have already consumed.
     *
     * Three cases per next segment:
     *   - Leaf        → emit a condition per filter, OR'd together.
     *   - STRUCT[]    → wrap in a new list_filter with a fresh lambda variable and recurse.
     *   - Scalar STRUCT → extend the dot-access prefix and recurse in the same lambda scope.
     */
    private static buildNestedConditions(
        filters: FileFilter[],
        accessPrefix: string,
        depth: number,
        pathIsArrayByName: Map<string, boolean[]>
    ): string {
        const bySegment = new Map<string, FileFilter[]>();
        for (const f of filters) {
            const seg = f.path[depth + 1];
            const bucket = bySegment.get(seg) ?? [];
            bucket.push(f);
            bySegment.set(seg, bucket);
        }

        const conditions: string[] = [];
        for (const [segment, group] of bySegment) {
            const access = `${accessPrefix}."${segment}"`;
            const atLeaf = group[0].path.length === depth + 2;
            // Filters in a correlated group share the same root STRUCT schema, so the
            // array-ness at this depth is the same for all of them; read it off the first.
            const groupPathIsArray = resolvePathIsArray(
                group[0].name,
                group[0].path.length,
                pathIsArrayByName
            );

            if (atLeaf) {
                const leafConds = group.map((f) =>
                    isLeafAnArray(groupPathIsArray)
                        ? SQLBuilder.listContains(access, f.value)
                        : SQLBuilder.matchByType(
                              access,
                              f.value,
                              f.valueType ?? AnnotationType.STRING,
                              true
                          )
                );
                conditions.push(`(${leafConds.join(" OR ")})`);
            } else if (groupPathIsArray[depth + 1]) {
                // STRUCT[]: open a new list_filter scope with a fresh lambda variable
                // representing the next segment (depth)
                const nextVar = `__e${depth + 1}`;
                const inner = FileFilter.buildNestedConditions(
                    group,
                    nextVar,
                    depth + 1,
                    pathIsArrayByName
                );
                conditions.push(SQLBuilder.listFilter(access, nextVar, inner));
            } else {
                // Scalar STRUCT: extend the dot-access prefix, stay in the same lambda scope
                conditions.push(
                    FileFilter.buildNestedConditions(group, access, depth + 1, pathIsArrayByName)
                );
            }
        }

        return conditions.join(" AND ");
    }
}
