/**
 * Given a path like ["Well", "Dose", "Unit"], returns a boolean[] of length path.length - 1
 * where each entry indicates whether that path segment is a STRUCT[] (array) rather than a
 * scalar STRUCT. The convention is: the root (first) segment is always an array, and all
 * intermediate segments are scalars unless explicitly overridden by schema metadata.
 *
 * Used as a fallback when schema-derived pathIsArray flags are unavailable.
 * DatabaseService.parseStructFields provides the authoritative values.
 */
export default function defaultPathIsArray(path: string[]): boolean[] {
    if (path.length <= 1) return [];
    // Root segment is STRUCT[] (array); all subsequent non-leaf segments are scalar STRUCT.
    return path.slice(0, -1).map((_, i) => i === 0);
}
