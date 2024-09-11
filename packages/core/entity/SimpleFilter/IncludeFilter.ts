import SimpleFilter from ".";

/**
 * A filter that indicates which annotations should make a file
 * be included in the fileset regardless of value;
 * e.g., return files that have any non-null value for this annnotation.
 * Responsible for serializing itself into a URL query string friendly format.
 */
export default class IncludeFilter extends SimpleFilter {
    public toQueryString(): string {
        return `include=${super.toQueryString()}`;
    }
}
