import { castArray } from "lodash";

import { AnnotationType } from "../AnnotationFormatter";
import { HIDDEN_UID_ANNOTATION } from "../../constants";

/**
 * A simple SQL query builder.
 */
export default class SQLBuilder {
    private isDescribing = false;
    private selectStatement = "*";
    private fromStatement?: string;
    private readonly whereClauses: string[] = [];
    private orderByClauses: string[] = [];
    private offsetNum?: number;
    private limitNum?: number;

    /**
     * Utility function to create a regex match for a value in a list
     *
     * Ex. This regex will match on a value
     * that is at the start, middle, end, or only value in a comma separated list
     * of values (,\s*Position,)|(^\s*Position\s*,)|(,\s*Position\s*$)|(^\s*Position\s*$)
     */
    public static regexMatchValueInList(
        expr: string,
        value: string | boolean | number | null
    ): string {
        // Escape special characters for regex
        const escapedValue = `${value}`.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        return `REGEXP_MATCHES(CAST(${expr} AS VARCHAR), '(,\\s*${escapedValue}\\s*,)|(^\\s*${escapedValue}\\s*,)|(,\\s*${escapedValue}\\s*$)|(^\\s*${escapedValue}\\s*$)') = true`;
    }

    /**
     * Build a case-insensitive substring (contains) match condition:
     * `REGEXP_MATCHES(CAST(expr AS VARCHAR), '(?i)pattern') = true`.
     */
    public static regexContains(expr: string, value: string | boolean | number | null): string {
        const regexEscaped = `${value}`
            .replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")
            .replaceAll("'", "''");
        return `REGEXP_MATCHES(CAST(${expr} AS VARCHAR), '(?i)${regexEscaped}') = true`;
    }

    /**
     * Build a DuckDB `list_transform` expression:
     * `list_transform(listExpr, varName -> body)`
     *
     * @param listExpr  A SQL expression that produces a DuckDB LIST.
     * @param varName   Lambda variable name (e.g. "__el").
     * @param body      The lambda body expression (e.g. `CAST(__el AS VARCHAR)`).
     */
    public static listTransform(listExpr: string, varName: string, body: string): string {
        return `list_transform(${listExpr}, ${varName} -> ${body})`;
    }

    /**
     * Build a WHERE-clause expression that tests whether at least one element of a DuckDB
     * list satisfies a condition: `len(list_filter(listExpr, varName -> condition)) > 0`.
     *
     * @param listExpr   A SQL expression that produces a DuckDB LIST.
     * @param varName    Lambda variable name (e.g. "__el").
     * @param condition  The lambda body condition (e.g. `CAST(__el AS DOUBLE) >= 1`).
     */
    public static listFilter(listExpr: string, varName: string, condition: string): string {
        return `len(list_filter(${listExpr}, ${varName} -> ${condition})) > 0`;
    }

    /**
     * Build a DuckDB numeric range condition: `CAST(expr AS DOUBLE) >= min AND CAST(expr AS DOUBLE) < max`.
     * Used for both flat-column WHERE clauses and lambda bodies inside list_filter.
     */
    public static doubleRange(expr: string, min: string, max: string): string {
        return `CAST(${expr} AS DOUBLE) >= ${min} AND CAST(${expr} AS DOUBLE) < ${max}`;
    }

    /**
     * Build a DuckDB timestamp range condition:
     * `CAST(expr AS TIMESTAMPTZ) >= CAST('min' AS TIMESTAMPTZ) AND CAST(expr AS TIMESTAMPTZ) < CAST('max' AS TIMESTAMPTZ)`.
     * Used for both flat-column WHERE clauses and lambda bodies inside list_filter.
     */
    public static timestampRange(expr: string, min: string, max: string): string {
        return `CAST(${expr} AS TIMESTAMPTZ) >= CAST('${min}' AS TIMESTAMPTZ) AND CAST(${expr} AS TIMESTAMPTZ) < CAST('${max}' AS TIMESTAMPTZ)`;
    }

    /**
     * Build a DuckDB INTERVAL-to-milliseconds equality condition:
     * `EXTRACT(epoch FROM expr)::BIGINT * 1000 = ms`.
     * Used for both flat-column WHERE clauses and lambda bodies inside list_filter.
     */
    public static durationEquals(expr: string, ms: string | number): string {
        return `EXTRACT(epoch FROM ${expr})::BIGINT * 1000 = ${ms}`;
    }

    /**
     * Build an ORDER BY expression that sorts a nested list by its minimum (ASC) or
     * maximum (DESC) element: `list_sort(listExpr)[1 | -1] order`.
     * Used by FileSort to sort files by a nested STRUCT[] sub-field.
     */
    public static listSortOrderBy(listExpr: string, order: string): string {
        const idx = order === "ASC" ? 1 : -1;
        return `list_sort(${listExpr})[${idx}] ${order}`;
    }

    /**
     * Build a WHERE-clause expression that tests whether a DuckDB list (from list_transform
     * on a STRUCT[] column) contains a specific value.
     *
     * Uses `list_has` for exact match after casting both sides to VARCHAR for uniform
     * comparison (struct field types may be INTEGER, FLOAT, VARCHAR, etc.).
     *
     * @param listExpression  A SQL expression that produces a DuckDB LIST (not JSON).
     * @param value           The value to search for.
     */
    public static listContains(
        listExpression: string,
        value: string | boolean | number | null
    ): string {
        const escaped = `${value}`.replaceAll("'", "''");
        // Cast the list elements to VARCHAR for uniform comparison, since the list may
        // contain INTEGERs / FLOATs but UI values are always strings.
        return `list_has(list_transform(${listExpression}, __el -> CAST(__el AS VARCHAR)), '${escaped}')`;
    }

    /**
     * Build a WHERE-clause expression testing whether ANY element of a DuckDB list matches a
     * case-insensitive substring — the list analog of `regexContains`. Used for FUZZY matching
     * a leaf that is itself a list (e.g. VARCHAR[]): each element is tested and `list_has`
     * checks whether any produced a match.
     *
     * @param listExpression  A SQL expression producing a DuckDB LIST.
     * @param value           The substring to search for in each element.
     */
    public static listRegexContains(
        listExpression: string,
        value: string | boolean | number | null
    ): string {
        const perElement = SQLBuilder.listTransform(
            listExpression,
            "__el",
            SQLBuilder.regexContains("__el", value)
        );
        return `list_has(${perElement}, true)`;
    }

    /**
     * Parse the RANGE(min, max) encoding produced by the number/date range pickers.
     * Returns sanitized min/max strings, or undefined when the value is not a range.
     */
    public static parseRangeBounds(value: any): { min: string; max: string } | undefined {
        const match = String(value).match(/^RANGE\((.+),\s*(.+)\)$/);
        if (!match) return undefined;
        const [, min, max] = match;
        // Allow only characters that appear in ISO-8601 timestamps and numeric values.
        const safe = /^[\w.+\-:TZ]+$/;
        if (!safe.test(min.trim()) || !safe.test(max.trim())) return undefined;
        return { min: min.trim(), max: max.trim() };
    }

    /**
     * Build a DuckDB expression that extracts a nested sub-field from a STRUCT[] column,
     * correctly handling intermediate arrays at any depth.
     *
     * Ex. When only the root is an array (common case):
     *   list_transform("Well", x -> x."Dose"."Unit")
     */
    public static buildNestedAccessExpression(
        path: string[],
        pathIsArray: boolean[],
        leafTransform?: (leafExpr: string) => string
    ): string {
        // Keep lambda variable names deterministic so generated SQL strings remain stable in tests.
        const lambdaVars = ["x", "y", "z", "w", "v", "u", "t", "s"];
        let nextLambdaVarIdx = 0;
        let flattenLayers = 0;
        const rootColumnExpr = `"${path[0]}"`;
        const isRootArray = pathIsArray[0];

        const nextLambdaVar = () => lambdaVars[nextLambdaVarIdx++];
        const transformLeaf = (leafExpr: string) =>
            leafTransform ? leafTransform(leafExpr) : leafExpr;
        const accessSegment = (baseExpr: string, pathIndex: number) =>
            `${baseExpr}."${path[pathIndex]}"`;

        // Recursive builder: each array boundary introduces a list_transform lambda;
        // scalar struct segments continue via dot-access on the current expression.
        function buildFrom(pathIndex: number, currentExpr: string): string {
            if (pathIndex === 0) {
                // Root column: either list_transform("Root", var -> ...) for STRUCT[]
                // or plain dot access for a scalar root struct.
                if (isRootArray) {
                    const lambdaVar = nextLambdaVar();
                    const innerExpr = buildFrom(1, lambdaVar);
                    return `list_transform(${rootColumnExpr}, ${lambdaVar} -> ${innerExpr})`;
                }
                return buildFrom(1, rootColumnExpr);
            }

            const isLeaf = pathIndex === path.length - 1;
            const segmentExpr = accessSegment(currentExpr, pathIndex);
            if (isLeaf) {
                return transformLeaf(segmentExpr);
            }

            // Intermediate array segment: add another transform layer and remember to
            // flatten once after the recursive expression is built.
            if (pathIsArray[pathIndex]) {
                flattenLayers++;
                const lambdaVar = nextLambdaVar();
                const innerExpr = buildFrom(pathIndex + 1, lambdaVar);
                return `list_transform(${segmentExpr}, ${lambdaVar} -> ${innerExpr})`;
            }

            // Intermediate scalar struct segment: continue dot access in the same scope.
            return buildFrom(pathIndex + 1, segmentExpr);
        }

        let expr = buildFrom(0, "");

        // Each intermediate array boundary adds one nested list layer to flatten.
        for (let i = 0; i < flattenLayers; i++) {
            expr = `flatten(${expr})`;
        }

        return expr;
    }

    /**
     * Build a type-aware SQL equality condition for a pre-formatted field expression.
     *
     * @param columnExpr  Pre-formatted SQL expression (e.g. `"Color"` or `__e0."Color"`).
     * @param value       The value to compare against.
     * @param columnType  The column type.
     * @param exactMatchStrings
     *                    When false (default): regex match for strings (flat-column context).
     *                    When true: exact CAST-to-VARCHAR equality with numeric heuristic
     *                    (lambda-body context where regex multi-value matching is wrong).
     */
    public static matchByType(
        columnExpr: string,
        value: any,
        columnType: AnnotationType,
        exactMatchStrings = false
    ): string {
        const range = SQLBuilder.parseRangeBounds(value);
        if (range) {
            const { min, max } = range;
            if (columnType === AnnotationType.DATETIME || columnType === AnnotationType.DATE)
                return SQLBuilder.timestampRange(columnExpr, min, max);
            if (columnType === AnnotationType.NUMBER)
                return SQLBuilder.doubleRange(columnExpr, min, max);
        }

        if (columnType === AnnotationType.BOOLEAN) return `${columnExpr} = ${value}`;
        if (columnType === AnnotationType.DURATION)
            return SQLBuilder.durationEquals(columnExpr, value);
        if (columnType === AnnotationType.NUMBER)
            return `CAST(${columnExpr} AS DOUBLE) = TRY_CAST('${value}' AS DOUBLE)`;

        // Escape single-quotes in the SQL string literal ex. O'Reilly -> O''Reilly
        const escaped = `${value}`.replaceAll("'", "''");
        return exactMatchStrings
            ? `CAST(${columnExpr} AS VARCHAR) = '${escaped}'`
            : SQLBuilder.regexMatchValueInList(columnExpr, value);
    }

    public describe(): SQLBuilder {
        this.isDescribing = true;
        return this;
    }

    public select(statement: string): SQLBuilder {
        this.selectStatement = statement;
        return this;
    }

    public from(statement: string | string[]): SQLBuilder {
        const statementAsArray = castArray(statement);
        if (!statementAsArray.length) {
            throw new Error('"FROM" statement requires at least one argument');
        }
        this.fromStatement = statementAsArray.sort().join(", ");
        return this;
    }

    public where(clause: string | string[]): SQLBuilder {
        if (Array.isArray(clause)) {
            clause.forEach((c) => this.whereClauses.push(c));
        } else {
            this.whereClauses.push(clause);
        }
        return this;
    }

    public whereAnd(clause: string | string[]): SQLBuilder {
        return this.where(clause);
    }

    // TODO: :( not implemented really
    public whereOr(clause: string | string[]): SQLBuilder {
        if (Array.isArray(clause)) {
            clause.forEach((c) => this.whereClauses.push(c));
        } else {
            this.whereClauses.push(clause);
        }
        return this;
    }

    public orderBy(clause: string): SQLBuilder {
        this.orderByClauses.push(clause);
        return this;
    }

    public removeOrderBy(): SQLBuilder {
        this.orderByClauses = [];
        return this;
    }

    public offset(offset: number): SQLBuilder {
        this.offsetNum = offset;
        return this;
    }

    public limit(limit: number): SQLBuilder {
        this.limitNum = limit;
        return this;
    }

    public toString(): string {
        return this.toSQL();
    }

    public toSQL(): string {
        if (!this.fromStatement) {
            throw new Error("Unable to build SQL without a FROM statement");
        }
        // LIMIT and OFFSET are non-deterministic without sorting.
        // There are some use cases for queries with a non-deterministic LIMIT 1, but BFF
        // doesn't have use cases for non-deterministic OFFSET queries, so use presence of
        // OFFSET to decide whether to make this deterministic.
        // So even if there is already an "order by" clause, secondarily sort on unique ID.
        // Exception: COUNT(*) queries should not require sorting
        if (this.offsetNum !== undefined && !this.selectStatement.includes("COUNT(*)")) {
            this.orderByClauses.push(HIDDEN_UID_ANNOTATION);
        }
        return `
            ${this.isDescribing ? "DESCRIBE" : ""}
            SELECT ${this.selectStatement}
            FROM "${this.fromStatement}"
            ${this.whereClauses.length ? `WHERE (${this.whereClauses.join(") AND (")})` : ""}
            ${this.orderByClauses.length > 0 ? `ORDER BY ${this.orderByClauses.join(", ")}` : ""}
            ${this.limitNum !== undefined ? `LIMIT ${this.limitNum}` : ""}
            ${this.offsetNum !== undefined ? `OFFSET ${this.offsetNum}` : ""}
        `;
    }
}
