import { compact, join } from "lodash";

import HttpServiceBase from "../HttpServiceBase";
import RestServiceResponse from "../../entity/RestServiceResponse";
import FileSelection from "../../entity/FileSelection";
import { JSONReadyRange } from "../../entity/NumericRange";

/**
 * Represents a sub-document that can be found within an FmsFile's `annotations` list.
 */
export interface FmsFileAnnotation {
    [key: string]: any;
    name: string;
    values: (string | number | boolean)[];
}

/**
 * Represents a document in the FMS MongoDb `files` collection (as returned by FES). It is extremely permissively typed to allow
 * for rapid iteration in the initial stages of this project.
 *
 * See https://aicsbitbucket.corp.alleninstitute.org/projects/SW/repos/mongo-schema-management/browse/mongo_schema_management/schema/file_explorer_v1/file.json for
 * the most up-to-date interface for this data structure.
 */
export interface FmsFile {
    [key: string]: any;
    annotations: FmsFileAnnotation[];
    fileId: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    uploaded: string;
    uploadedBy: string;
    positions?: { id: number }[]; // TODO: Add Ticket for this
    channels?: { id: number }[]; // TODO: Add Ticket for this
    times?: { id: number }[]; // TODO: Add Ticket for this
    thumbnailPath?: string;
}

export interface GetFilesRequest {
    from: number; // page offset
    limit: number; // size of page
    queryString: string; // file filters and applied sort order(s) in their query string form (e.g., "scientist=jane&sort=date-created(ASC)")
}

export interface Selection {
    filters: {
        [index: string]: string | number | boolean;
    };
    indexRanges: JSONReadyRange[];
}

export interface SelectionRequest {
    annotations: string[];
    selections: Selection[];
}

interface SelectionResult {
    count: number;
    histogramMap: any; // Unsure exactly what this is / will be
    size: number;
}

/**
 * Service responsible for fetching file related metadata.
 */
export default class FileService extends HttpServiceBase {
    public static readonly FILES_ENDPOINT_VERSION = "1.0";
    public static readonly BASE_FILES_URL = `file-explorer-service/${FileService.FILES_ENDPOINT_VERSION}/files`;
    public static readonly BASE_FILE_IDS_URL = `file-explorer-service/${FileService.FILES_ENDPOINT_VERSION}/files/ids`;
    public static readonly BASE_FILE_COUNT_URL = `file-explorer-service/${FileService.FILES_ENDPOINT_VERSION}/files/count`;
    public static readonly SELECTION_AGGREGATE_URL = `file-explorer-service/2.0/files/selection/aggregate`;

    public async getCountOfMatchingFiles(queryString: string): Promise<number> {
        const requestUrl = join(
            compact([`${this.baseUrl}/${FileService.BASE_FILE_COUNT_URL}`, queryString]),
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

    public async getAggregateInformation(fileSelection: FileSelection) {
        const selections = fileSelection.toSelections();
        const postBody: SelectionRequest = { annotations: [], selections };
        const requestUrl = `${this.baseUrl}/${FileService.SELECTION_AGGREGATE_URL}`;
        console.log(`Requesting aggregate results of matching files ${postBody}`);

        const response = await this.post<SelectionResult>(requestUrl, JSON.stringify(postBody));

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
    public async getFiles(request: GetFilesRequest): Promise<RestServiceResponse<FmsFile>> {
        const { from, limit, queryString } = request;

        const base = `${this.baseUrl}/${FileService.BASE_FILES_URL}?from=${from}&limit=${limit}`;
        const requestUrl = join(compact([base, queryString]), "&");
        console.log(`Requesting files from ${requestUrl}`);

        return await this.get<FmsFile>(requestUrl);
    }

    /**
     * GM 1/29/2020: This is a TEMPORARY service method that is only necessary until we move manifest generation to a backend service.
     * When that happens, this method can be deleted.
     */
    public async getFilesById(fileIds: string[]): Promise<FmsFile[]> {
        const url = `${this.baseUrl}/${FileService.BASE_FILES_URL}`;
        const result = await this.httpClient.post<RestServiceResponse<FmsFile>>(url, fileIds);

        // first .data to access out of AxiosResponse, second .data to get out of RestServiceResponse. :(.
        return result.data.data;
    }

    /**
     * Get list of file_ids of file documents that match a given filter, potentially according to a particular sort order.
     */
    public async getFileIds(queryString: string): Promise<string[]> {
        const requestUrl = join(
            compact([`${this.baseUrl}/${FileService.BASE_FILE_IDS_URL}`, queryString]),
            "?"
        );
        console.log(`Requesting file ids from ${requestUrl}`);

        const response = await this.get<string>(requestUrl);
        return response.data;
    }
}
