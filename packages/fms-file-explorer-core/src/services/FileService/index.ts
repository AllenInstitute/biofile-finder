import { compact, join } from "lodash";

import HttpServiceBase from "../HttpServiceBase";
import RestServiceResponse from "../../entity/RestServiceResponse";

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
    fileType: string;
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

/**
 * Service responsible for fetching file related metadata.
 */
export default class FileService extends HttpServiceBase {
    public static readonly FILES_ENDPOINT_VERSION = "1.0";
    public static readonly BASE_FILES_URL = `file-explorer-service/${FileService.FILES_ENDPOINT_VERSION}/files`;
    public static readonly BASE_FILE_IDS_URL = `file-explorer-service/${FileService.FILES_ENDPOINT_VERSION}/files/ids`;
    public static readonly BASE_FILE_COUNT_URL = `file-explorer-service/${FileService.FILES_ENDPOINT_VERSION}/files/count`;

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
     * Fetch metadata for a range of files from within the result set this query corresponds to.
     * May overfetch files.
     */
    public async getFilesByIndices(startIndex: number, endIndex: number, queryString: string) {
        const { limit, offset } = FileService.calculatePaginationFromIndices(startIndex, endIndex);
        const response = await this.getFiles({
            from: offset,
            limit,
            queryString,
        });
        return { response, offset, limit };
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

    /**
     * Best-effort (iterative) calculation of limit (page size) and offset (page number).
     *
     * Traditionally, we would request pages of data one at a time, one after the other. Pages are defined by
     * "offsets," which is how many pages it takes to get to the start of the current page, and a "limit", which is
     * the size of the page. For example, if requesting ?offset=4&limit=5, we should expect data corresponding to the indices
     * 20 - 24. The start index === (offset * limit), and the end index === (start index + limit - 1).
     *
     * Here, it's more complicated--we need to be able to do "random access" paging. We need to be to fetch the data that
     * corresponds to, e.g., indices 53 - 102 within some set of files. In the next moment, if the user takes the scroll
     * bar and drastically moves it, the next "page" of data needed might correspond to indices 821 - 847. So, both the
     * "offset" and "limit" need to be dynamic constructs.
     *
     * There's no strong guarantee that the limit and offset returned will fully cover the requested indices.
     *
     * Written in collaboration between Gabe and Dan--final code written by Dan and copy/pasted by Gabe.
     */
    private static calculatePaginationFromIndices(start: number, end: number) {
        // inclusive range of indices
        const totalRange = end - start + 1;
        const minPageSize = totalRange;
        const maxPageSize = end + 1;

        // initial conditions are worst-case; start at 0 and include all data up to end
        let offset = 0;
        let limit = end + 1;

        for (let i = minPageSize; i <= maxPageSize; ++i) {
            // round UP; number of pages that is inclusive of end index
            const numPages = Math.ceil((end + 1) / i);

            offset = numPages - 1;
            limit = i;

            // numpages should always be >= 1
            // check to see if start is contained in first page
            // end is guaranteed to be in end of page because of how numPages is calculated
            if (offset * i <= start) {
                return { offset, limit };
            }
        }

        // should never be reached, here for completeness/typing
        return { offset, limit };
    }
}

export const DefaultFileService = new FileService();
