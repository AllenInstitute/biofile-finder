import { castArray } from "lodash";
import QueryMode from "../QueryMode";
import DatabaseService from "../../services/DatabaseService";

/**
 * A simple SQL query builder.
 */
export default class SQLBuilder {
    private isSummarizing = false;
    private isDescribing = false;
    private selectStatement = "*";
    private fromStatement?: string;
    private readonly whereClauses: string[] = [];
    private orderByClauses: string[] = [];
    private offsetNum?: number;
    private limitNum?: number;
    private queryMode?: QueryMode;

    /**
     * Utility function to create a regex match for a value in a list
     *
     * Ex. This regex will match on a value
     * that is at the start, middle, end, or only value in a comma separated list
     * of values (,\s*Position,)|(^\s*Position\s*,)|(,\s*Position\s*$)|(^\s*Position\s*$)
     */
    public static regexMatchValueInList(
        column: string,
        value: string | boolean | number | null
    ): string {
        // Escape special characters for regex
        const escapedValue = `${value}`.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        return `REGEXP_MATCHES(CAST("${column}" AS VARCHAR), '(,\\s*${escapedValue}\\s*,)|(^\\s*${escapedValue}\\s*,)|(,\\s*${escapedValue}\\s*$)|(^\\s*${escapedValue}\\s*$)') = true`;
    }

    public describe(): SQLBuilder {
        if (this.isSummarizing) {
            throw new Error('"DESCRIBE" cannot be used with "SUMMARIZE"');
        }
        this.isDescribing = true;
        return this;
    }

    public summarize(): SQLBuilder {
        if (this.isDescribing) {
            throw new Error('"SUMMARIZE" cannot be used with "DESCRIBE"');
        }
        this.isSummarizing = true;
        return this;
    }

    public select(statement: string): SQLBuilder {
        this.selectStatement = statement;
        return this;
    }

    // We could modify every call to .from to support direct from parquet mode, or we could rename the data sources.
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

    public limit(limit: number, queryMode: QueryMode): SQLBuilder {
        this.limitNum = limit;
        this.queryMode = queryMode;
        return this;
    }

    public toString(): string {
        return this.toSQL();
    }

    public toSQL(): string {
        if (!this.fromStatement) {
            throw new Error("Unable to build SQL without a FROM statement");
        }
        // LIMIT is non-deterministic without sorting
        // So even if there is already an "order by" clause, secondarily sort on unique ID.
        // Exception: COUNT(*) queries should not require sorting
        if (this.limitNum && !this.selectStatement.includes("COUNT(*)")) {
            this.orderByClauses.push(
                this.queryMode == QueryMode.DIRECT_FROM_PARQUET
                    ? DatabaseService.PARQUET_ROW_NUMBER_COL
                    : DatabaseService.HIDDEN_UID_ANNOTATION
            );
        }
        return `
            ${this.isDescribing ? "DESCRIBE" : ""}
            ${this.isSummarizing ? "SUMMARIZE" : ""}
            SELECT ${this.selectStatement}
            FROM "${this.fromStatement}"
            ${this.whereClauses.length ? `WHERE (${this.whereClauses.join(") AND (")})` : ""}
            ${this.orderByClauses.length > 0 ? `ORDER BY ${this.orderByClauses.join(", ")}` : ""}
            ${this.limitNum !== undefined ? `LIMIT ${this.limitNum}` : ""}
            ${this.offsetNum !== undefined ? `OFFSET ${this.offsetNum}` : ""}
        `;
    }
}
