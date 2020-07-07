export default interface FileDownloadService {
    downloadCsvManifest(url: string, data: string, onEnd?: () => void): Promise<void>;
}
