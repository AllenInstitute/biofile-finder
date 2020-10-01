import PersistentConfigService from ".";

export default class PersistentConfigServiceNoop implements PersistentConfigService {
    public get() {
        return undefined;
    }

    public set() {
        return;
    }

    public setAllenMountPoint() {
        return Promise.resolve(
            "Attempting to set allen mount point using PersistentConfigServiceNoop"
        );
    }

    public setImageJExecutableLocation() {
        return Promise.resolve(
            "Attempting to set Image J executable location using PersistentConfigServiceNoop"
        );
    }
}
