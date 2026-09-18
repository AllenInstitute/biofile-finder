import { isString, isNumber } from "lodash";
import stringNaturalCompare from "string-natural-compare";

/**
 * Compare function that can be passed to Array::sort which will:
 *    - delegate to string-natural-compare if inputs are strings
 *    - always perform a case-insensitive sort if inputs are strings
 *    - always sort numbers in ascending order
 *    - do nothing if inputs are neither strings nor numbers
 */
export function naturalComparator(a: any, b: any): number {
    if (isString(a) && isString(b)) {
        return stringNaturalCompare(a, b, { caseInsensitive: true });
    }

    if (isNumber(a) && isNumber(b)) {
        return a - b;
    }

    // don't bother trying to sort other types
    return 0;
}

/**
 * Formats a quantity string, using either the singular or plural form.
 * @param quantity count of items.
 * @param singular the singular form of the item name
 * @param plural the plural form of the item name
 * @returns a string formatted as "{quantity} {singular/plural}"
 */
export function formatQuantityString(quantity: number, singular: string, plural: string): string {
    return `${quantity} ${quantity === 1 ? singular : plural}`;
}
