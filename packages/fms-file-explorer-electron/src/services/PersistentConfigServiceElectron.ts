import LRUCache from "lru-cache";

import { PersistentConfigService } from "@aics/fms-file-explorer-core";

const MAX_CACHE_SIZE = 1000;

/**
 * Platform dependent service for persistenting configuration data.
 *
 * Ex. saving which columns a users wants to export to a CSV could be stored here.
 */
export default class PersistentConfigServiceElectron implements PersistentConfigService {
    private cache = new LRUCache<string, any>({ max: MAX_CACHE_SIZE });

    public get(key: string): any {
        return this.cache.get(key);
    }

    public set(key: string, value: any): void {
        this.cache.set(key, value);
    }
}
