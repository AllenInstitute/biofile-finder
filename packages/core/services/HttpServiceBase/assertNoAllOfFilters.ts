import FileFilter, { CombineMode } from "../../entity/FileFilter";

/**
 * The File Explorer Service has no way to require several values of one annotation at once,
 * so "all values" filters (e.g. from a shared URL) can't be honored. Fail rather than silently
 * returning files that match any of the values.
 *
 * Once we move away from this API (soon) or implement support for it, this can go away
 */
export default function assertNoAllOfFilters(filters: FileFilter[]) {
    if (filters.some((filter) => filter.combineMode === CombineMode.ALL)) {
        throw new Error('"All values" filters are not supported by this data source');
    }
}
