import {
    PersistentConfigService,
    PersistedConfig,
    PersistedConfigKeys,
} from "../../../core/services";

export default class PersistentConfigServiceElectron implements PersistentConfigService {
    public get(): any {
        return undefined;
    }

    public getAll(): PersistedConfig {
        return {};
    }

    public persist(config: PersistedConfig): void;
    public persist(key: PersistedConfigKeys, value: any): void;
    public persist() {
        // No-op
    }
}
