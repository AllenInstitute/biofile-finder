/**
 * A simple container to represent simple filters to apply to a file
 * set. Parent class for filters that consist of only an annotation name
 * without an associated value.
 */
export default class SimpleFilter {
    public readonly annotationName: string;

    constructor(annotationName: string) {
        this.annotationName = annotationName;
    }

    public toJSON(): Record<string, string> {
        return {
            annotationName: this.annotationName,
        };
    }

    public equals(other?: SimpleFilter): boolean {
        return !!other && this.annotationName === other.annotationName;
    }

    public toQueryString(): string {
        return `${this.annotationName}`;
    }
}
