export enum SortOrder {
    ASC = "ASC",
    DESC = "DESC",
}

/**
 * A simple container to represent a sort order applied to a file set. Responsible for serializing itself into a URL
 * query string friendly format.
 */
export default class FileSort {
    private readonly annotationName: string;
    private readonly order: SortOrder;

    constructor(annotationName: string, order: SortOrder) {
        this.annotationName = annotationName;
        this.order = order;
    }

    public toQueryString(): string {
        return `sort=${this.annotationName}(${this.order})`;
    }
}
