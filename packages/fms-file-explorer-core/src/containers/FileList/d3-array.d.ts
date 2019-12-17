/**
 * The community curated @types/d3-array is incorrect for the group function
 */
declare module "d3-array" {
    type key<TObject, TKey> = (value: TObject) => TKey;

    export function group<TObject, TKey>(
        a: Iterable<TObject>,
        ...keys: key<TObject, TKey>[]
    ): Map<TKey, TObject[]>;

    export function groups<TObject, TKey>(
        a: Iterable<TObject>,
        ...keys: key<TObject, TKey>[]
    ): [TKey, TObject[]];
}
