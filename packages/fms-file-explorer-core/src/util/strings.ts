import stringNaturalCompare from "string-natural-compare";

/**
 * Simple wrapper around string-natural-compare. This exists because the library doesn't publish
 * type declarations, so needed to add some and it makes sense to colocate the usage of the library
 * with the typings.
 */
export function naturalCompare(a: string, b: string, caseInsensitive = true): number {
    return stringNaturalCompare(a, b, { caseInsensitive });
}
