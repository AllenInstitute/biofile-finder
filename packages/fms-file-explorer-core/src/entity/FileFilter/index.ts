/**
 * Stub for a filter used to constrain a listing of files to those that match a particular condition. Should be
 * serializable to a URL query string-friendly format.
 */
export default class FileFilter {
    private readonly annotationName: string;
    private readonly annotationValue: any;

    public static isFileFilter(candidate: any): candidate is FileFilter {
        return candidate instanceof FileFilter;
    }

    constructor(annotationName: string, annotationValue: any) {
        this.annotationName = annotationName;
        this.annotationValue = annotationValue;
    }

    public get name() {
        return this.annotationName;
    }

    public get value() {
        return this.annotationValue;
    }

    public toQueryString(): string {
        return `${this.annotationName}=${this.annotationValue}`;
    }

    public toJSON() {
        return this.toQueryString();
    }

    public equals(target: FileFilter): boolean {
        return (
            this.annotationName === target.annotationName &&
            this.annotationValue === target.annotationValue
        );
    }
}
