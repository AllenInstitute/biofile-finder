import { castArray } from "lodash";

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
        columnOrExpr: string,
        value: string | boolean | number | null,
        isExpression = false
    ): string {
        // Escape special characters for regex
        const escapedValue = `${value}`.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        const castExpr = isExpression ? columnOrExpr : `CAST("${columnOrExpr}" AS VARCHAR)`;
        return `REGEXP_MATCHES(${castExpr}, '(,\\s*${escapedValue}\\s*,)|(^\\s*${escapedValue}\\s*,)|(,\\s*${escapedValue}\\s*$)|(^\\s*${escapedValue}\\s*$)') = true`;
    }

    /**
     * Build a WHERE-clause expression that tests whether a DuckDB JSON array expression
     * contains a specific value.
     *
     * `json_extract("Well"::JSON, '$[*].Gene')` returns a JSON array like `["Chroma4","Chroma5"]`.
     * This helper generates a `json_contains` call to check membership.
     */
    public static jsonArrayContains(
        arrayExpression: string,
        value: string | boolean | number | null
    ): string {
        // Escape single-quotes in the SQL string literal.
        const escaped = `${value}`.replaceAll("'", "''");
        const castExpr = `CAST(${arrayExpression} AS VARCHAR)::JSON`;

        // TODO: This could be simplified by the data automatically detecting numbers vs strings
        if (typeof value === "string") {
            // Values are always stringified by fetchValues (String(v).trim()), but the
            // underlying JSON may store the value as a number.  When the string looks like
            // a finite number, check both the JSON-string form ("5589") and the JSON-number
            // form (5589) so that numeric values stored in JSON are matched.
            const asNum = Number(value);
            const looksNumeric =
                value.trim() !== "" && isFinite(asNum) && String(asNum) === value.trim();
            const strCheck = `json_contains(${castExpr}, '"${escaped}"'::JSON) = true`;
            if (looksNumeric) {
                return `(${strCheck} OR json_contains(${castExpr}, '${asNum}'::JSON) = true)`;
            }
            return strCheck;
        }

        // Non-string primitives (number, boolean, null): pass the value as-is in JSON form.
        return `json_contains(${castExpr}, '${escaped}'::JSON) = true`;
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
     * Build a DuckDB expression that extracts a nested sub-field from a STRUCT[] column,
     * correctly handling intermediate arrays at any depth.
     *
     * @param path       Full annotation path, e.g. ["Well", "Dose", "Unit"]
     * @param pathIsArray Boolean array (length = path.length - 1) indicating which non-leaf
     *                    segments are arrays (STRUCT[]). E.g. [true, true] means both "Well"
     *                    and "Dose" are STRUCT[] columns.
     * @returns A SQL expression that produces a flat list of leaf values, e.g.:
     *   flatten(list_transform("Well", x -> list_transform(x."Dose", y -> y."Unit")))
     *
     * When only the root is an array (common case):
     *   list_transform("Well", x -> x."Dose"."Unit")
     */
    public static buildNestedAccessExpression(path: string[], pathIsArray: boolean[]): string {
        const VAR_NAMES = ["x", "y", "z", "w", "v", "u", "t", "s"];
        let varIdx = 0;
        let flattenCount = 0;

        // Recursive builder: at each array boundary, introduce a list_transform;
        // at each scalar struct boundary, continue with dot access.
        function buildInner(segmentIdx: number, currentExpr: string): string {
            if (segmentIdx === 0) {
                // Root column
                if (pathIsArray[0]) {
                    const v = VAR_NAMES[varIdx++];
                    const inner = buildInner(1, v);
                    return `list_transform("${path[0]}", ${v} -> ${inner})`;
                } else {
                    // Singular struct at root (rare) — just dot access
                    return buildInner(1, `"${path[0]}"`);
                }
            }

            const isLeaf = segmentIdx === path.length - 1;
            const access = `${currentExpr}."${path[segmentIdx]}"`;

            if (isLeaf) {
                return access;
            }

            // Intermediate segment
            if (pathIsArray[segmentIdx]) {
                // This intermediate is an array — need another list_transform
                flattenCount++;
                const v = VAR_NAMES[varIdx++];
                const inner = buildInner(segmentIdx + 1, v);
                return `list_transform(${access}, ${v} -> ${inner})`;
            } else {
                // Scalar struct — continue dot access
                return buildInner(segmentIdx + 1, access);
            }
        }

        let expr = buildInner(0, "");

        // Each intermediate array adds one level of list nesting that must be flattened
        for (let i = 0; i < flattenCount; i++) {
            expr = `flatten(${expr})`;
        }

        return expr;
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
