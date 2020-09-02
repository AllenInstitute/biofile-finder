import PersistentConfigService from ".";

export default class PersistentConfigServiceNoop implements PersistentConfigService {
    public get(): any {
        return "test";
    }

    public set(): void {}
}
