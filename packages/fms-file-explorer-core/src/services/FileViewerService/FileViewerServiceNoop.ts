import FileViewerService from ".";

export default class FileViewerServiceNoop implements FileViewerService {
    public initialize() {
        return;
    }

    public selectAllenMountPoint() {
        return Promise.resolve("Attempting to set allen mount point using FileViewerServiceNoop");
    }

    public selectImageJExecutableLocation() {
        return Promise.resolve(
            "Attempting to set Image J executable location using FileViewerServiceNoop"
        );
    }

    public getDefaultAllenMountPointForOs() {
        return Promise.resolve(
            "Attempting to find default allen mount point for OS using FileViewerServiceNoop"
        );
    }

    public isValidAllenMountPoint() {
        return Promise.resolve(false);
    }

    public isValidImageJLocation() {
        return Promise.resolve(false);
    }

    public openFilesInImageJ() {
        return Promise.resolve();
    }
}
