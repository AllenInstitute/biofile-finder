import { compact, every, filter, find, includes, isEmpty, join, snakeCase } from "lodash";
import * as LRUCache from "lru-cache";

import HttpServiceBase from "../HttpServiceBase";
import RestServiceResponse, { Response } from "../../entity/RestServiceResponse";
import { DataSource } from "../../constants";

/**
 * Represents a sub-document that can be found within an FmsFile's `annotations` list.
 */
export interface FmsFileAnnotation {
    [key: string]: any;
    name: string;
    values: any[];
}

/**
 * Represents a document in the FMS MongoDb `files` collection. It is extremely permissively typed to allow
 * for rapid iteration in the initial stages of this project.
 *
 * See https://aicsbitbucket.corp.alleninstitute.org/projects/SW/repos/mongo-schema-management/browse/mongo_schema_management/schema/file_explorer_v1/file.json for
 * the most up-to-date interface for this data structure.
 */
export interface FmsFile {
    [key: string]: any;
    fileId: string;
    annotations?: FmsFileAnnotation[];
}

export interface GetFilesRequest {
    from: number; // page offset
    limit: number; // size of page
    queryString: string; // file filters and applied sort order(s) in their query string form (e.g., "scientist=jane&sort=date-created(ASC)")
    startIndex: number; // TEMPORARY UNTIL QUERY SERVICE EXISTS
    endIndex: number; // TEMPORARY UNTIL QUERY SERVICE EXISTS
}

/**
 * Service responsible for fetching file related metadata.
 */
export default class FileService extends HttpServiceBase {
    public static readonly FILES_ENDPOINT_VERSION = "1.0";
    public static readonly BASE_FILES_URL = `file-explorer-service/${FileService.FILES_ENDPOINT_VERSION}/files`;
    public static readonly BASE_FILE_IDS_URL = `file-explorer-service/${FileService.FILES_ENDPOINT_VERSION}/files/ids`;
    public static readonly BASE_FILE_COUNT_URL = `file-explorer-service/${FileService.FILES_ENDPOINT_VERSION}/files/count`;

    // TEMPORARY TO SUPPORT FLAT-FILE BASED IMPLEMENTATION UNTIL QUERY SERVICE EXISTS
    private cache = new LRUCache<string, Response<FmsFile>>({ max: 10 });

    public async getCountOfMatchingFiles(queryString: string): Promise<number> {
        if (this.baseUrl !== DataSource.FLAT_FILE) {
            const requestUrl = join(
                compact([`${this.baseUrl}/${FileService.BASE_FILE_COUNT_URL}`, queryString]),
                "?"
            );
            console.log(`Requesting count of matching files from ${requestUrl}`);

            const response = await this.get<number>(requestUrl);

            // data is always an array, this endpoint should always return an array of length 1
            if (response.data.length !== 1) {
                throw new Error(
                    `Expected response.data of ${requestUrl} to contain a single count`
                );
            }

            return response.data[0];
        }

        // TEMPORARY, FLAT-FILE BASED IMPLEMENTATION UNTIL QUERY SERVICE IS STABLE
        console.log("Requesting count from flat file: assets/files.json");
        return new Promise<number>((resolve) => {
            const result = this.getFromFlatFile(queryString);
            resolve(result.totalCount);
        });
    }

    /**
     * Get list of file documents that match a given filter, potentially according to a particular sort order,
     * and potentially starting from a particular file_id and limited to a set number of files.
     */
    public async getFiles(request: GetFilesRequest): Promise<RestServiceResponse<FmsFile>> {
        const { from, limit, queryString } = request;

        if (this.baseUrl !== DataSource.FLAT_FILE) {
            const base = `${this.baseUrl}/${FileService.BASE_FILES_URL}?from=${from}&limit=${limit}`;
            const requestUrl = join(compact([base, queryString]), "&");
            console.log(`Requesting files from ${requestUrl}`);

            return await this.get<FmsFile>(requestUrl);
        }

        // TEMPORARY, FLAT-FILE BASED IMPLEMENTATION UNTIL QUERY SERVICE IS STABLE
        console.log("Requesting files from flat file: assets/files.json");
        return new Promise<RestServiceResponse>((resolve) => {
            const result = this.getFromFlatFile(queryString);

            // In a real API call this will be unnecessary, but until then, need to grab just the subset of
            // data requested.
            const requestedRange = result.data.slice(request.startIndex, request.endIndex + 1);
            resolve(new RestServiceResponse({ ...result, data: requestedRange }));
        });
    }

    /**
     * GM 1/29/2020: This is a TEMPORARY service method that is only necessary until we move manifest generation to a backend service.
     * When that happens, this method can be deleted.
     */
    public async getFilesById(fileIds: string[]): Promise<FmsFile[]> {
        if (this.baseUrl !== DataSource.FLAT_FILE) {
            const url = `${this.baseUrl}/${FileService.BASE_FILES_URL}`;
            const result = await this.httpClient.post<RestServiceResponse<FmsFile>>(url, fileIds);

            // first .data to access out of AxiosResponse, second .data to get out of RestServiceResponse. :(.
            return result.data.data;
        }

        return new Promise<FmsFile[]>((resolve) => {
            const res = require("../../../assets/files.json");
            const setOfIds = new Set(fileIds);
            resolve(res.data.filter((file: FmsFile) => setOfIds.has(file.fileId)));
        });
    }

    /**
     * Get list of file_ids of file documents that match a given filter, potentially according to a particular sort order.
     */
    public async getFileIds(queryString: string): Promise<string[]> {
        if (this.baseUrl !== DataSource.FLAT_FILE) {
            const requestUrl = join(
                compact([`${this.baseUrl}/${FileService.BASE_FILE_IDS_URL}`, queryString]),
                "?"
            );
            console.log(`Requesting file ids from ${requestUrl}`);

            const response = await this.get<string>(requestUrl);
            return response.data;
        }

        // TEMPORARY, FLAT-FILE BASED IMPLEMENTATION UNTIL QUERY SERVICE EXISTS
        console.log("Requesting file ids from flat file: assets/files.json");
        const makeRequest = () =>
            new Promise<RestServiceResponse>((resolve) => {
                const result = this.getFromFlatFile(queryString);

                resolve(new RestServiceResponse(result));
            });

        const res = await makeRequest();
        return res.data.map((file) => file.fileId);
    }

    /**
     * TEMPORARY TO SUPPORT FLAT-FILE BASED IMPLEMENTATION UNTIL QUERY SERVICE EXISTS
     *
     * Temporary helper method to accomplish the shared logic between `getFiles` and `getFileIds`
     * because they both pull from the same flat file.
     */
    private getFromFlatFile(queryString: string): Response<FmsFile> {
        let cached = this.cache.get(queryString);

        if (cached === undefined) {
            const searchParams = new URLSearchParams(queryString);
            const searchParamFilters: [string, any][] = [];
            for (const pair of searchParams.entries()) {
                searchParamFilters.push(pair);
            }
            const res = require("../../../assets/files.json");

            let files;
            if (isEmpty(searchParamFilters)) {
                files = res.data;
            } else {
                console.time(`Filtering files by ${searchParamFilters}`);
                files = filter(res.data, (file) => {
                    return every(searchParamFilters, ([key, value]) => {
                        const annotation = find(
                            file.annotations,
                            ({ name }) => snakeCase(name) === snakeCase(key)
                        );
                        if (!annotation) {
                            return false;
                        }

                        return includes(annotation.values, value);
                    });
                });
                console.timeEnd(`Filtering files by ${searchParamFilters}`);
            }

            const updatedRes = {
                ...res,
                data: files,
                totalCount: files.length,
            };
            this.cache.set(queryString, updatedRes);

            cached = updatedRes;
        }

        return cached as Response<FmsFile>;
    }
}

export const DefaultFileService = new FileService();
