declare module "zarrita" {
    export interface Store {
        getItem(key: string): Promise<ArrayBuffer>;
    }

    export class HTTPStore implements Store {
        constructor(baseUrl: string);
        getItem(key: string): Promise<ArrayBuffer>;
    }

    export function open<T>(params: {
        store: Store;
        path: string;
    }): Promise<{ getRaw(): Promise<T> }>;
}
