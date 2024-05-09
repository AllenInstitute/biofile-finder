/**
 * A simple SQL query builder.
 */
export default class SQLBuilder {
    private isSummarizing = false;
    private selectStatement = "*";
    private fromStatement?: string;
    private readonly whereClauses: string[] = [];
    private orderByClause?: string;
    private offsetNum?: number;
    private limitNum?: number;

    public summarize(): SQLBuilder {
        this.isSummarizing = true;
        return this;
    }

    public select(statement: string): SQLBuilder {
        this.selectStatement = statement;
        return this;
    }

    public from(statement: string): SQLBuilder {
        this.fromStatement = statement;
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

    public orderBy(clause?: string): SQLBuilder {
        this.orderByClause = clause;
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

    public toSQL(): string {
        if (!this.fromStatement) {
            throw new Error("Unable to build SLQ without a FROM statement");
        }
        return `
            ${this.isSummarizing ? "SUMMARIZE" : ""}
            SELECT ${this.selectStatement}
            FROM "${this.fromStatement}"
            ${this.whereClauses.length ? `WHERE (${this.whereClauses.join(") AND (")})` : ""}
            ${this.orderByClause ? `ORDER BY ${this.orderByClause}` : ""}
            ${this.offsetNum !== undefined ? `OFFSET ${this.offsetNum}` : ""}
            ${this.limitNum !== undefined ? `LIMIT ${this.limitNum}` : ""}
        `;
    }
}
