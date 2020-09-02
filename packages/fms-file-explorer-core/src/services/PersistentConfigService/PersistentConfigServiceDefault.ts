import PersistentConfigService from ".";
import { isNil } from "lodash";

/**
 * Platform dependent service for persistenting configuration data.
 * Does not persist data between reloads, closing/opening, or updates.
 *
 * Ex. saving which columns a users wants to export to a CSV could be stored here.
 */
export default class PersistentConfigServiceDefault implements PersistentConfigService {
    public get(key: string): any {
        const item = localStorage.getItem(key);
        return isNil(item) ? undefined : JSON.parse(item);
    }

    public set(key: string, value: any): void {
        localStorage.setItem(key, JSON.stringify(value));
    }
}
