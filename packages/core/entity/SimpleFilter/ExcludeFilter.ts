import SimpleFilter from ".";

/**
 * A filter that indicates which annotations
 * should exclude a file from the fileset regardless of value;
 * e.g., only return files that have null/blank values for this annotation.
 * Responsible for serializing itself into a URL query string friendly format.
 */
export default class ExcludeFilter extends SimpleFilter {
    public toQueryString(): string {
        return `exclude=${super.toQueryString()}`;
    }
}
