import FileViewerService from ".";

export default class FileViewerServiceNoop implements FileViewerService {
    public selectAllenMountPoint() {
        return Promise.resolve("Attempting to set allen mount point using FileViewerServiceNoop");
    }

    public selectImageJExecutableLocation() {
        return Promise.resolve(
            "Attempting to set Image J executable location using FileViewerServiceNoop"
        );
    }

    public getValidatedAllenDriveLocation() {
        return Promise.resolve(undefined);
    }

    public getValidatedImageJLocation() {
        return Promise.resolve(undefined);
    }

    public isValidAllenMountPoint() {
        return Promise.resolve(false);
    }

    public openFilesInImageJ() {
        return Promise.resolve();
    }
}
