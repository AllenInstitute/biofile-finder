import { compact, map } from "lodash";

import HttpServiceBase, { ConnectionConfig } from "../HttpServiceBase";
import { defaultFileSetFactory } from "../../entity/FileSet/FileSetFactory";
import NumericRange, { JSONReadyRange } from "../../entity/NumericRange";
import FileDownloadService from "../FileDownloadService";
import FileService from "../FileService";

interface SelectionRequest {
    filters: {
        [index: string]: string | number | boolean;
    };
    indexRanges: JSONReadyRange[];
}

interface CsvServiceConfig extends ConnectionConfig {
    downloadService: FileDownloadService;
}

export default class CsvService extends HttpServiceBase {
    public static BASE_CSV_DOWNLOAD_URL = `${FileService.BASE_FILES_URL}/selection/manifest`;

    private downloadService: FileDownloadService;

    public constructor(config: CsvServiceConfig) {
        super(config);
        this.downloadService = config.downloadService;
    }

    public async downloadCsv(fileSetToSelectionMapping: {
        [index: string]: NumericRange[];
    }): Promise<void> {
        const postBody: SelectionRequest[] = compact(
            map(fileSetToSelectionMapping, (selections: NumericRange[], fileSetHash: string) => {
                const fileSet = defaultFileSetFactory.get(fileSetHash);
                if (!fileSet) {
                    return;
                }

                return {
                    filters: fileSet.filters.reduce((accum, filter) => {
                        return {
                            ...accum,
                            [filter.name]: filter.value,
                        };
                    }, {}),
                    indexRanges: selections.map((range) => range.toJSON()),
                };
            })
        );
        const stringifiedPostBody = JSON.stringify(postBody);
        const url = `${this.baseUrl}/${CsvService.BASE_CSV_DOWNLOAD_URL}`;

        this.downloadService.downloadCsvManifest(url, stringifiedPostBody);

        // const config = {
        //     responseType: "blob" as "blob",
        // }

        // this.httpClient.post(`${this.baseUrl}/${CsvService.BASE_CSV_DOWNLOAD_URL}`, postBody, config)
        //     .then((response) => {
        //         // download the file
        //         const url = window.URL.createObjectURL(new Blob([response.data]));
        //         const link = document.createElement("a");
        //         link.setAttribute("href", url);
        //         link.setAttribute("download", "fms-explorer-selection.csv");
        //         link.style.visibility = "hidden";
        //         // document.body.appendChild(link);
        //         link.click();
        //         // document.body.removeChild(link);
        //         window.URL.revokeObjectURL(url);
        //     });
    }
}
