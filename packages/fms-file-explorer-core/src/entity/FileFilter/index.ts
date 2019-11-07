/**
 * Stub for a filter used to constrain a listing of files to those that match a particular condition. Should be
 * serializable to a URL query string-friendly format.
 */
export default class FileFilter {
    private annotationName: string;
    private annotationValue: any;

    constructor(annotationName: string, annotationValue: any) {
        this.annotationName = annotationName;
        this.annotationValue = annotationValue;
    }

    public toQueryString(): string {
        return `${this.annotationName}=${this.annotationValue}`;
    }

    public equals(target: FileFilter): boolean {
        return (
            this.annotationName === target.annotationName &&
            this.annotationValue === target.annotationValue
        );
    }
}
