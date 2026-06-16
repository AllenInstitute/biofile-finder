/**
 * TODO: This is a temporary default implementation of `pathIsArray` that assumes all
 * paths are scalar except for the first path segment. This is sufficient just for this changeset
 * and is intended to be removed in favor of pulling this information directly from the redux state.
 */
export default function defaultPathIsArray(path: string[]): boolean[] {
    return Array.from({ length: Math.max(0, path.length - 1) }, (_, i) => i === 0);
}
