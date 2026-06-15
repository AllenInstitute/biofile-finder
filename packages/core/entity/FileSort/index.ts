import { isEqual } from "lodash";

import defaultPathIsArray from "../pathIsArray";
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
    /**
     * Which non-leaf path segments are arrays (STRUCT[]). Length = path.length - 1.
     * Defaults to [true, false, ...] (root is array, rest are scalar structs).
     */
    public readonly pathIsArray: boolean[];

    constructor(path: string[], order: SortOrder, pathIsArray?: boolean[]) {
        this.path = path;
        if (this.path.length > 1) {
            throw new Error(
                `Nested sort annotations are not yet supported (path: ${this.path.join(".")})`
            );
        }
        this.order = order;
        // Schema-derived flags (Annotation.pathIsArray) are authoritative; this is a fallback.
        this.pathIsArray = pathIsArray ?? defaultPathIsArray(this.path);
    }

    // TODO: Also, remove or replace when we stop using dot notation for annotation paths
    public get annotationName(): string {
        return this.path.join(".");
    }

    public toQueryString(): string {
        // Dotted name (not the JSON path array): consumed by the FES HTTP API and FileSet
        // cache keys, which expect `sort=annotation(ORDER)`. URL-sharing uses toJSON()/path.
        return `sort=${this.annotationName}(${this.order})`;
    }

    public toQuerySQLBuilder(): SQLBuilder {
        return new SQLBuilder().orderBy(`"${this.path[0]}" ${this.order}`);
    }

    public toJSON(): Record<string, string | string[]> {
        return {
            path: this.path,
            order: this.order,
        };
    }

    public equals(other?: FileSort): boolean {
        return !!other && isEqual(this.path, other.path) && this.order === other.order;
    }
}
