import FileFilter, { FilterType } from "../FileFilter";

/**
 * A simple wrapper for filter that indicates which annotations
 * should exclude a file from the fileset regardless of value;
 * e.g., only return files that have null/blank values for this annotation.
 */
export default class ExcludeFilter extends FileFilter {
    constructor(annotationName: string) {
        super(annotationName, "", FilterType.EXCLUDE);
    }
}
