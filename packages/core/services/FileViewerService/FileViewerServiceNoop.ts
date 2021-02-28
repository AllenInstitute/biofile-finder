import FileViewerService from ".";

export default class FileViewerServiceNoop implements FileViewerService {
    public open() {
        return Promise.resolve();
    }
}
