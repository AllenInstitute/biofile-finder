import { isEqual } from "lodash";

import SQLBuilder from "../SQLBuilder";

export enum SortOrder {
    ASC = "ASC",
    DESC = "DESC",
}

/**
 * A simple container to represent a sort order applied to a file set. Responsible for serializing itself into a URL
 * query string friendly format.
 */
export default class FileSort {
    public readonly path: string[];
    public readonly order: SortOrder;

    constructor(annotationName: string | string[], order: SortOrder) {
        this.path = Array.isArray(annotationName) ? annotationName : annotationName.split(".");
        this.order = order;
    }

    // TODO: This is a misnomer since it may not be display-friendly, should be "key" or something
    // TODO: Also, remove or replace when we stop using dot notation for annotation paths
    public get annotationName(): string {
        return this.path.join(".");
    }

    public toQueryString(): string {
        // Dotted name (not the JSON path array): consumed by the FES HTTP API and FileSet
        // cache keys, which expect `sort=annotation(ORDER)`. URL-sharing uses toJSON()/path.
        return `sort=${this.annotationName}(${this.order})`;
    }

    /**
     * Build the ORDER BY clause body (without the "ORDER BY" keyword) for this sort, so callers
     * that already have a SQLBuilder can append it via `.orderBy(...)`. Centralizes the nested
     * sub-field sort logic so the file-list query and the manifest/download query stay in sync.
     *
     * `pathIsArray` is the schema-derived STRUCT[] flags for this sort's annotation (see
     * resolvePathIsArray); for a flat (single-segment) sort it is ignored.
     */
    public toOrderByClause(pathIsArray: boolean[]): string {
        const accessExpr = SQLBuilder.buildNestedAccessExpression(this.path, pathIsArray);
        // Array-bearing path: the expression is a LIST; sort by its min/max element.
        // Scalar-struct path: the expression is a single dot-access value; sort directly.
        return pathIsArray.some(Boolean)
            ? SQLBuilder.listSortOrderBy(accessExpr, this.order)
            : `${accessExpr} ${this.order}`;
    }

    public toJSON(): Record<string, string> {
        return {
            annotationName: this.annotationName,
            order: this.order,
        };
    }

    public equals(other?: FileSort): boolean {
        return !!other && isEqual(this.path, other.path) && this.order === other.order;
    }
}
