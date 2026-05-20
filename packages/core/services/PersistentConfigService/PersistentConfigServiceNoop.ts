import PersistentConfigService, { PersistedConfig } from ".";

export default class PersistentConfigServiceNoop implements PersistentConfigService {
    public get() {
        return Promise.resolve();
    }

    public getAll(): PersistedConfig {
        return {};
    }

    public clear() {
        return Promise.resolve();
    }

    public persist() {
        return Promise.resolve();
    }
}
