/**
 * GM (Dec 17, 2019): The community curated @types/d3-array is incorrect for both the cross and groups functions.
 */
declare module "d3-array" {
    type CrossReducer = (a: any, b: any) => any;
    export function cross(...values: (Iterable<any> | CrossReducer)[]): any[];

    type GroupKey<TObject, TKey> = (value: TObject) => TKey;
    export function groups<TObject, TKey>(
        a: Iterable<TObject>,
        ...keys: GroupKey<TObject, TKey>[]
    ): [TKey, TObject[]];
}
