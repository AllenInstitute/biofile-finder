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

    // TODO: Stop accepting string - this is just to avoid too many line changes at once
    constructor(path: string | string[], order: SortOrder) {
        this.path = Array.isArray(path) ? path : [path];
        this.order = order;
    }

    // TODO: This is a misnomer since it may not be display-friendly, should be "key" or something
    // TODO: Also, remove or replace when we stop using dot notation for annotation paths
    public get annotationName(): string {
        return this.path.join(".");
    }

    public toQueryString(): string {
        return `sort=${JSON.stringify(this.path)}(${this.order})`;
    }

    public toQuerySQLBuilder(): SQLBuilder {
        // TODO: RIP this is NOT accurate!!!
        return new SQLBuilder().orderBy(`"${this.path[0]}" ${this.order}`);
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
