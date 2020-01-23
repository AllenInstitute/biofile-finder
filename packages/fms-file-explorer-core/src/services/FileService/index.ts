import { compact, every, filter, find, includes, isEmpty, join, snakeCase } from "lodash";
import * as LRUCache from "lru-cache";

import RestServiceResponse, { Response } from "../../entity/RestServiceResponse";

/**
 * Represents a sub-document that can be found within an FmsFile's `annotations` list.
 */
export interface FmsFileAnnotation {
    [key: string]: any;
    annotation_name: string;
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
    file_id: string;
    annotations?: FmsFileAnnotation[];
}

export interface GetFilesRequest {
    fromId: string; // starting file_id of the result set
    limit: number; // number of files to request
    queryString: string; // file filters and applied sort order(s) in their query string form (e.g., "scientist=jane&sort=date-created(ASC)")
    startIndex: number; // TEMPORARY UNTIL QUERY SERVICE EXISTS
    endIndex: number; // TEMPORARY UNTIL QUERY SERVICE EXISTS
}

export interface GetFileIdsRequest {
    queryString: string; // file filters and applied sort order(s) in their query string form (e.g., "scientist=jane&sort=date-created(ASC)")
}

/**
 * Service responsible for fetching file related metadata.
 */
export default class FileService {
    private static readonly BASE_FILES_URL = "api/1.0/files";
    private static readonly BASE_FILE_IDS_URL = "api/1.0/files/ids";

    // TEMPORARY TO SUPPORT FLAT-FILE BASED IMPLEMENTATION UNTIL QUERY SERVICE EXISTS
    private cache = new LRUCache<string, Response<FmsFile>>({ max: 10 });

    /**
     * Get list of file documents that match a given filter, potentially according to a particular sort order,
     * and potentially starting from a particular file_id and limited to a set number of files.
     */
    public getFiles(request: GetFilesRequest): Promise<RestServiceResponse<FmsFile>> {
        const { fromId, limit, queryString, startIndex, endIndex } = request;

        const base = `${FileService.BASE_FILES_URL}?from=${fromId}&limit=${limit}`;
        const requestUrl = join(compact([base, queryString]), "&");
        console.log(`Requesting files from ${requestUrl}`);

        // TEMPORARY, FLAT-FILE BASED IMPLEMENTATION UNTIL QUERY SERVICE EXISTS
        return new Promise<RestServiceResponse>((resolve) => {
            const result = this.getFromFlatFile(queryString);

            // In a real API call this will be unnecessary, but until then, need to grab just the subset of
            // data requested.
            const requestedRange = result.data.slice(startIndex, endIndex + 1);
            resolve(new RestServiceResponse({ ...result, data: requestedRange }));
        });
    }

    /**
     * Get list of file_ids of file documents that match a given filter, potentially according to a particular sort order.
     */
    public async getFileIds(request: GetFileIdsRequest): Promise<string[]> {
        const { queryString } = request;

        const requestUrl = join(compact([FileService.BASE_FILE_IDS_URL, queryString]), "?");
        console.log(`Requesting file ids from ${requestUrl}`);

        // TEMPORARY, FLAT-FILE BASED IMPLEMENTATION UNTIL QUERY SERVICE EXISTS
        const makeRequest = () =>
            new Promise<RestServiceResponse>((resolve) => {
                const result = this.getFromFlatFile(queryString);

                resolve(new RestServiceResponse(result));
            });

        const res = await makeRequest();
        return res.data.map((file) => file.file_id);
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
                            ({ annotation_name }) => snakeCase(annotation_name) === key
                        );
                        if (!annotation) {
                            return false;
                        }

                        return includes(annotation.values, value);
                    });
                });
                console.timeEnd(`Filtering files by ${searchParamFilters}`);
            }

            const enrichedWithIndex = files.map((file: {}, index: number) => ({
                result_set_index: index,
                ...file,
            }));
            const updatedRes = {
                ...res,
                data: enrichedWithIndex,
                totalCount: enrichedWithIndex.length,
            };
            this.cache.set(queryString, updatedRes);

            cached = updatedRes;
        }

        return cached as Response<FmsFile>;
    }
}
