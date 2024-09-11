import SimpleFilter from ".";

/**
 * A simple container to represent a fuzzy filter to apply to a file set.
 * Responsible for serializing itself into a URL query string friendly format.
 */
export default class FuzzyFilter extends SimpleFilter {
    public toQueryString(): string {
        return `fuzzy=${super.toQueryString()}`;
    }
}
