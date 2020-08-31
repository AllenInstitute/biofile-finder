import { compact, map } from "lodash";

import HttpServiceBase, { ConnectionConfig } from "../HttpServiceBase";
import { defaultFileSetFactory } from "../../entity/FileSet/FileSetFactory";
import NumericRange, { JSONReadyRange } from "../../entity/NumericRange";
import FileDownloadService from "../FileDownloadService";
import FileService from "../FileService";

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
    public static BASE_CSV_DOWNLOAD_URL = `${FileService.BASE_FILES_URL}/selection/manifest`;

    private downloadService: FileDownloadService;

    public constructor(config: CsvServiceConfig) {
        super(config);
        this.downloadService = config.downloadService;
    }

    public downloadCsv(
        fileSetToSelectionMapping: {
            [index: string]: NumericRange[];
        },
        columns: string[],
        manifestDownloadId: string
    ): Promise<string> {
        const selections: Selection[] = compact(
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
