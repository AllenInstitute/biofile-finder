import FileViewerService from ".";

export default class FileViewerServiceNoop implements FileViewerService {
    public openFilesInImageJ() {
        return Promise.resolve();
    }
}
