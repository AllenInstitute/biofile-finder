import FileFilter, { FilterType } from "../FileFilter";

/**
 * A simple wrapper for filter that indicates which annotations should make a file
 * be included in the fileset regardless of value;
 * e.g., return files that have any non-null value for this annnotation.
 */
export default class IncludeFilter extends FileFilter {
    constructor(annotationName: string) {
        super(annotationName, "", FilterType.ANY);
    }
}
