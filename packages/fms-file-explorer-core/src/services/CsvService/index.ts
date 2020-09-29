import HttpServiceBase, { ConnectionConfig } from "../HttpServiceBase";
import FileSet from "../../entity/FileSet";
import NumericRange, { JSONReadyRange } from "../../entity/NumericRange";
import FileDownloadService from "../FileDownloadService";

interface Selection {
    filters: {
        [index: string]: string | number | boolean;
    };
    indexRanges: JSONReadyRange[];
}

interface SelectionRequest {
    annotations: string[];
    selections: Selection[];
}

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
        fileSetToSelectionMapping: Map<FileSet, NumericRange[]>,
        columns: string[],
        manifestDownloadId: string
    ): Promise<string> {
        const selections: Selection[] = [];
        for (const [fileSet, selectedRanges] of fileSetToSelectionMapping.entries()) {
            const selection: Selection = {
                filters: fileSet.filters.reduce((accum, filter) => {
                    return {
                        ...accum,
                        [filter.name]: filter.value,
                    };
                }, {}),
                indexRanges: selectedRanges.map((range) => range.toJSON()),
            };
            selections.push(selection);
        }
        const postBody: SelectionRequest = {
            annotations: columns,
            selections,
        };
        const stringifiedPostBody = JSON.stringify(postBody);
        const url = `${this.baseUrl}/${CsvService.BASE_CSV_DOWNLOAD_URL}`;

        return this.downloadService.downloadCsvManifest(
            url,
            stringifiedPostBody,
            manifestDownloadId
        );
    }
}
