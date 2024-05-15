/**
 * A simple container to represent a fuzzy filter to apply to a file set.
 * Responsible for serializing itself into a URL query string friendly format.
 */
export default class FileFuzzyFilter {
    public readonly annotationName: string;

    constructor(annotationName: string) {
        this.annotationName = annotationName;
    }

    public toQueryString(): string {
        return `fuzzy=${this.annotationName}`;
    }

    public equals(other?: FileFuzzyFilter): boolean {
        return !!other && this.annotationName === other.annotationName;
    }
}
