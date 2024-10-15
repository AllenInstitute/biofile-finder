import FileFilter, { FilterType } from "../FileFilter";

/**
 * A simple wrapper for filters where annotation should regex match/contain
 * the value but doesn't need to equal it exctly
 */
export default class FuzzyFilter extends FileFilter {
    constructor(annotationName: string, annotationValue = "") {
        super(annotationName, annotationValue, FilterType.FUZZY);
    }
}
