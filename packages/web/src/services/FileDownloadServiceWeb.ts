import {
    FileDownloadService,
    DownloadResult,
    FileInfo,
    DownloadResolution,
} from "../../../core/services";

export default class FileDownloadServiceWeb implements FileDownloadService {
    isFileSystemAccessible = false;

    // public async downloadFiles(urls: string[]): Promise<void> {
    // throw new Error("blah")
    // const zip = JsZip();
    // await Promise.all(urls.map(async (url) => {
    //     const fileName = url.replace(/^.*[\\/]/, '');
    //     const response = await fetch(url, { "mode": "no-cors" }) // TODO: Cors...
    //     console.log("response", response)
    //     const blob = await response.blob();
    //     zip.file(fileName, blob);
    // }));
    // zip.generateAsync({type: 'blob'}).then(zipFile => {
    //     const currentDate = new Date().getTime();
    //     const fileName = `combined-${currentDate}.zip`;
    //     return this.download(fileName, zipFile);
    // });

    //   const downloadAndZip = urls => {
    //     return downloadByGroup(urls, 5).then(exportZip);
    //   }
    // }

    public async download(fileInfo: FileInfo): Promise<DownloadResult> {
        const data = fileInfo.data || fileInfo.path;
        let downloadUrl;
        if (data instanceof Uint8Array) {
            downloadUrl = URL.createObjectURL(new Blob([data]));
        } else if (data instanceof Blob) {
            downloadUrl = URL.createObjectURL(data);
        } else {
            downloadUrl = data;
        }

        try {
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = fileInfo.name;
            a.target = "_blank";
            a.click();
            a.remove();
            return {
                downloadRequestId: fileInfo.id,
                resolution: DownloadResolution.SUCCESS,
            };
        } catch (err) {
            console.error(`Failed to download file: ${err}`);
            throw err;
        } finally {
            URL.revokeObjectURL(downloadUrl);
        }
    }

    public cancelActiveRequest() {
        /** noop: Browser will handle cancellation */
    }
}
