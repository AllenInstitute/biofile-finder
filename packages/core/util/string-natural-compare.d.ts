/**
 * Type definitions for https://github.com/nwoltman/string-natural-compare.
 */
declare module "string-natural-compare" {
    interface NaturalCompareOpts {
        alphabet?: string;
        caseInsensitive?: boolean;
    }
    export default function (a: string, b: string, opts?: NaturalCompareOpts): number;
}
