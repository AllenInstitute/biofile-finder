import { compact, join } from "lodash";

import FileService, { GetFilesRequest, SelectionAggregationResult } from "..";
import HttpServiceBase from "../../HttpServiceBase";
import FileSelection from "../../../entity/FileSelection";
import { JSONReadyRange } from "../../../entity/NumericRange";
import FileSet from "../../../entity/FileSet";
import FileDetail, { FmsFile } from "../../../entity/FileDetail";

export interface Selection {
    filters: {
        [index: string]: (string | number | boolean)[];
    };
    indexRanges: JSONReadyRange[];
    sort?: {
        annotationName: string;
        ascending: boolean;
    };
}

interface SelectionAggregationRequest {
    selections: Selection[];
}

/**
 * Service responsible for fetching file related metadata.
 */
export default class HttpFileService extends HttpServiceBase implements FileService {
    private static readonly ENDPOINT_VERSION = "3.0";
    public static readonly BASE_FILES_URL = `file-explorer-service/${HttpFileService.ENDPOINT_VERSION}/files`;
    public static readonly BASE_FILE_COUNT_URL = `${HttpFileService.BASE_FILES_URL}/count`;
    public static readonly SELECTION_AGGREGATE_URL = `${HttpFileService.BASE_FILES_URL}/selection/aggregate`;

    public async getCountOfMatchingFiles(fileSet: FileSet): Promise<number> {
        const requestUrl = join(
            compact([
                `${this.baseUrl}/${HttpFileService.BASE_FILE_COUNT_URL}${this.pathSuffix}`,
                fileSet.toQueryString(),
            ]),
            "?"
        );
        console.log(`Requesting count of matching files from ${requestUrl}`);

        const response = await this.get<number>(requestUrl);

        // data is always an array, this endpoint should always return an array of length 1
        if (response.data.length !== 1) {
            throw new Error(`Expected response.data of ${requestUrl} to contain a single count`);
        }

        return response.data[0];
    }

    public async getAggregateInformation(
        fileSelection: FileSelection
    ): Promise<SelectionAggregationResult> {
        const selections = fileSelection.toCompactSelectionList();
        const postBody: SelectionAggregationRequest = { selections };
        const requestUrl = `${this.baseUrl}/${HttpFileService.SELECTION_AGGREGATE_URL}${this.pathSuffix}`;
        console.log(`Requesting aggregate results of matching files ${postBody}`);

        const response = await this.post<SelectionAggregationResult>(
            requestUrl,
            JSON.stringify(postBody)
        );

        // data is always an array, this endpoint should always return an array of length 1
        if (response.data.length !== 1) {
            throw new Error(`Expected response.data of ${postBody} to contain a single count`);
        }
        return response.data[0];
    }

    /**
     * Get list of file documents that match a given filter, potentially according to a particular sort order,
     * and potentially starting from a particular file_id and limited to a set number of files.
     */
    public async getFiles(request: GetFilesRequest): Promise<FileDetail[]> {
        const { from, limit, fileSet } = request;

        const base = `${this.baseUrl}/${HttpFileService.BASE_FILES_URL}${this.pathSuffix}?from=${from}&limit=${limit}`;
        const requestUrl = join(compact([base, fileSet.toQueryString()]), "&");
        console.log(`Requesting files from ${requestUrl}`);

        const response = await this.get<FmsFile>(requestUrl);
        return response.data.map((file) => new FileDetail(file));
    }
}
