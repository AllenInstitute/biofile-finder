import HttpServiceBase, { ConnectionConfig } from "../HttpServiceBase";
import FileDownloadService, { DownloadResult } from "../FileDownloadService";
import { SelectionRequest } from "../FileService";

interface CsvServiceConfig extends ConnectionConfig {
    downloadService: FileDownloadService;
}

/**
 * Service responsible for requesting a CSV manifest of metadata for selected files. Delegates
 * heavy-lifting of the downloading to a platform-dependent implementation of the FileDownloadService.
 */
export default class CsvService extends HttpServiceBase {
    private static CSV_ENDPOINT_VERSION = "2.0";
    public static BASE_CSV_DOWNLOAD_URL = `file-explorer-service/${CsvService.CSV_ENDPOINT_VERSION}/files/selection/manifest`;

    private downloadService: FileDownloadService;

    public constructor(config: CsvServiceConfig) {
        super(config);
        this.downloadService = config.downloadService;
    }

    public downloadCsv(
        selectionRequest: SelectionRequest,
        manifestDownloadId: string
    ): Promise<DownloadResult> {
        const stringifiedPostBody = JSON.stringify(selectionRequest);
        const url = `${this.baseUrl}/${CsvService.BASE_CSV_DOWNLOAD_URL}`;

        return this.downloadService.downloadCsvManifest(
            url,
            stringifiedPostBody,
            manifestDownloadId
        );
    }
}
