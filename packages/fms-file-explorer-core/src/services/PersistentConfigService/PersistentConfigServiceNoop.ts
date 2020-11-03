import PersistentConfigService from ".";

export default class PersistentConfigServiceNoop implements PersistentConfigService {
    public get() {
        return undefined;
    }

    public getAll() {
        return {};
    }

    public persist() {
        return;
    }
}
