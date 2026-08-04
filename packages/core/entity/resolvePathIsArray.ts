/**
 * This class is a temporary helper for resolving whether parts of an annotation's path
 * is an array (ex. STRUCT[]) at SQL-generation time.
 * However! This is intended to be replaced with a more robust version by combining
 * the path itself with pathIsArray so that they can never be out of sync. For example, the path could be represented as an array of objects like:
 *  [
 *    { name: "Well", isArray: true },
 *    { name: "Dose", isArray: false },
 *    { name: "Unit", isArray: false }
 *  ]
 */

/**
 * Resolve the schema-derived `pathIsArray` flags for an annotation at SQL-generation time.
 */
export default function resolvePathIsArray(
    name: string,
    pathLength: number,
    pathIsArrayByName: Map<string, boolean[]>
): boolean[] {
    if (pathLength <= 1) {
        return [];
    }
    const pathIsArray = pathIsArrayByName.get(name);
    if (pathIsArray === undefined) {
        throw new Error(
            `Cannot generate SQL for nested annotation "${name}": its pathIsArray is missing ` +
                `from the schema map. The annotation must exist in the active data source.`
        );
    }
    return pathIsArray;
}

/**
 * True when a NON-leaf segment is a list (STRUCT[])
 */
export function hasArrayBeforeLeaf(pathIsArray: boolean[]): boolean {
    return pathIsArray.slice(0, -1).some(Boolean);
}

/**
 * True when the leaf field is itself a list (e.g. VARCHAR[])
 */
export function isLeafAnArray(pathIsArray: boolean[]): boolean {
    return pathIsArray.length > 0 && pathIsArray[pathIsArray.length - 1];
}
