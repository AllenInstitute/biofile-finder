import { compact, join } from "lodash";

import RestServiceResponse from "../RestServiceResponse";

export interface FmsFile {
    [key: string]: any;
    file_id: string;
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
    private static readonly BASE_FILES_URL = "api/1.0/file";
    private static readonly BASE_FILE_IDS_URL = "api/1.0/file/ids";

    public getFiles(request: GetFilesRequest): Promise<RestServiceResponse<FmsFile>> {
        const { fromId, limit, queryString, startIndex, endIndex } = request;

        const base = `${FileService.BASE_FILES_URL}?from=${fromId}&limit=${limit}`;
        const requestUrl = join(compact([base, queryString]), "&");
        console.log(`Requesting files from ${requestUrl}`);

        // TEMPORARY, FLAT-FILE BASED IMPLEMENTATION UNTIL QUERY SERVICE EXISTS
        return new Promise<RestServiceResponse>((resolve) => {
            setTimeout(() => {
                const res = require("../../../assets/files.json");
                // In a real API call this will be unnecessary, but until then, need to grab just the subset of
                // data requested.
                const requestedRange = res.data.slice(startIndex, endIndex + 1);
                resolve(new RestServiceResponse({ ...res, data: requestedRange }));
            }, 750);
        });
    }

    public async getFileIds(request: GetFileIdsRequest): Promise<string[]> {
        const { queryString } = request;

        const requestUrl = join(compact([FileService.BASE_FILE_IDS_URL, queryString]), "?");
        console.log(`Requesting file ids from ${requestUrl}`);

        // TEMPORARY, FLAT-FILE BASED IMPLEMENTATION UNTIL QUERY SERVICE EXISTS
        let page = 0;
        const fetch = (): Promise<RestServiceResponse<string>> => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    const res = require(`../../../assets/file-ids-${page}.json`);
                    page += 1;
                    resolve(new RestServiceResponse(res));
                }, 750);
            });
        };

        const fileIds: string[] = [];
        let res = await fetch();
        res.data.forEach((id) => fileIds.push(id));
        while (res.hasMore) {
            res = await fetch();
            res.data.forEach((id) => fileIds.push(id));
        }

        return fileIds;
    }
}
