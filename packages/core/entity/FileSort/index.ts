import { isEqual } from "lodash";
import SQLBuilder from "../SQLBuilder";
import defaultPathIsArray from "../pathIsArray";

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
    /**
     * Which non-leaf path segments are arrays (STRUCT[]). Length = path.length - 1.
     * Defaults to [true, false, ...] (root is array, rest are scalar structs).
     */
    public readonly pathIsArray: boolean[];

    // TODO: Stop accepting string - this is just to avoid too many line changes at once
    constructor(path: string | string[], order: SortOrder, pathIsArray?: boolean[]) {
        this.path = Array.isArray(path) ? path : [path];
        this.order = order;
        // Schema-derived flags (Annotation.pathIsArray) are authoritative; this is a fallback.
        this.pathIsArray = pathIsArray ?? defaultPathIsArray(this.path);
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
     */
    public toOrderByClause(): string {
        if (this.path.length > 1) {
            // For nested sub-fields, sort by the min (ASC) or max (DESC) value in the
            // extracted list. list_sort ensures deterministic results regardless of the
            // original element order in the array.
            const listExpr = SQLBuilder.buildNestedAccessExpression(this.path, this.pathIsArray);
            const idx = this.order === SortOrder.ASC ? 1 : -1;
            return `list_sort(${listExpr})[${idx}] ${this.order}`;
        }
        return `"${this.path[0]}" ${this.order}`;
    }

    public toJSON(): Record<string, string> {
        return {
            path: JSON.stringify(this.path),
            order: this.order,
        };
    }

    public equals(other?: FileSort): boolean {
        return (
            !!other && isEqual(this.path, other.path) && this.order === other.order
        );
    }
}
