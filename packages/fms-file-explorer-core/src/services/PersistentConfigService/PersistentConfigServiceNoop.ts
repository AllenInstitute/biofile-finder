import PersistentConfigService from ".";

export default class PersistentConfigServiceNoop implements PersistentConfigService {
    public get() {
        return undefined;
    }

    public set() {
        return;
    }
}
