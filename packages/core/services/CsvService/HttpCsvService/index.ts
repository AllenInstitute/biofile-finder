import CsvService, { CsvManifestRequest } from "..";
import FileDownloadService, {
    DownloadResult,
} from "../../FileDownloadService";
import HttpServiceBase, { ConnectionConfig } from "../../HttpServiceBase";

interface Config extends ConnectionConfig {
    downloadService: FileDownloadService;
}

/**
 * Service responsible for requesting a CSV manifest of metadata for selected files. Delegates
 * heavy-lifting of the downloading to a platform-dependent implementation of the FileDownloadService.
 */
export default class HttpCsvService extends HttpServiceBase implements CsvService {
    private static readonly ENDPOINT_VERSION = "2.0";
    public static readonly BASE_CSV_DOWNLOAD_URL = `file-explorer-service/${HttpCsvService.ENDPOINT_VERSION}/files/selection/manifest`;
    private readonly downloadService: FileDownloadService;

    public constructor(config: Config) {
        super(config);
        this.downloadService = config.downloadService;
    }

    public async getCsvAsBytes(
        selectionRequest: CsvManifestRequest,
        manifestDownloadId: string
    ): Promise<Uint8Array> {
        const stringifiedPostBody = JSON.stringify(selectionRequest);
        const url = `${this.baseUrl}/${HttpCsvService.BASE_CSV_DOWNLOAD_URL}${this.pathSuffix}`;
        return Promise.reject("blah")
        // return this.downloadService.downloadCsvManifest(
        //     url,
        //     stringifiedPostBody,
        //     manifestDownloadId
        // );
    }
}
