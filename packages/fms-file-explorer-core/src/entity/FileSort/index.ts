export enum SortOrder {
    ASC = "ASC",
    DESC = "DESC",
}

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
