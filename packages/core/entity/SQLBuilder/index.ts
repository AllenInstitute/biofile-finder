import { castArray } from "lodash";
import { DatabaseService } from "../../services";

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
     * Utility function to create a regex match for a value in a list.
     *
     * Ex. This regex will match on a value
     * that is at the start, middle, end, or only value in a comma separated list
     * of values (,\s*Position,)|(^\s*Position\s*,)|(,\s*Position\s*$)|(^\s*Position\s*$)
     *
     * @param columnOrExpr  Either a bare column name (will be quoted) or, when
     *                      `isExpression=true`, a SQL expression that is already valid
     *                      (e.g. `CAST(json_extract("Well"::JSON, '$.*.Gene') AS VARCHAR)`).
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
     *
     * @param arrayExpression  A SQL expression that produces a JSON array (not quoted as a column).
     * @param value            The value to search for.
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
            this.orderByClauses.push(DatabaseService.HIDDEN_UID_ANNOTATION);
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
