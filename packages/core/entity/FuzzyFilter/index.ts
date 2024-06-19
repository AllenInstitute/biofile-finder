/**
 * A simple container to represent a fuzzy filter to apply to a file set.
 * Responsible for serializing itself into a URL query string friendly format.
 */
export default class FuzzyFilter {
    public readonly annotationName: string;

    constructor(annotationName: string) {
        this.annotationName = annotationName;
    }

    public toQueryString(): string {
        return `fuzzy=${this.annotationName}`;
    }

    //TODO: Do we need SQL support?

    public toJSON(): Record<string, string> {
        return {
            annotationName: this.annotationName,
        };
    }

    public equals(other?: FuzzyFilter): boolean {
        return !!other && this.annotationName === other.annotationName;
    }
}
