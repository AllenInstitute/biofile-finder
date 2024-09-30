import FileFilter, { FilterType } from "../FileFilter";

/**
 * A simple wrapper for FuzzyFilters
 */
export default class FuzzyFilter extends FileFilter {
    constructor(annotationName: string, annotationValue = "") {
        super(annotationName, annotationValue, FilterType.FUZZY);
    }
}
