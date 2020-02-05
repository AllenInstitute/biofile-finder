import { defaults, flatten, join, map } from "lodash";
import * as LRUCache from "lru-cache";

import FileFilter from "../FileFilter";
import FileSort from "../FileSort";
import FileService, { FmsFile } from "../../services/FileService";

interface Opts {
    fileService: FileService;
    filters: FileFilter[];
    maxCacheSize: number;
    sortOrder: FileSort[];
}

const DEFAULT_OPTS: Opts = {
    fileService: new FileService(),
    filters: [],
    maxCacheSize: 1000,
    sortOrder: [],
};

function isPromise(arg: any): arg is Promise<any> {
    return arg instanceof Promise;
}

/**
 * Represents the filters and applied sorting that together produce a set of files from FMS. Note that the same set of
 * file filters with a different sort order is a different FileSet.
 *
 * Responsible for fetching the set of file ids that corresponds to this set of filters/sort order as well as loading
 * the subsets of file metadata that will be displayed in the file list.
 */
export default class FileSet {
    private cache: LRUCache<string, FmsFile>;
    private _fileIds: string[] = [];
    private readonly fileService: FileService;
    private readonly _filters: FileFilter[];
    private loaded: Promise<string[]> | undefined;
    private readonly sortOrder: FileSort[];
    private totalFileCount: number | undefined;

    constructor(opts: Partial<Opts> = {}) {
        const { fileService, filters, maxCacheSize, sortOrder } = defaults({}, opts, DEFAULT_OPTS);

        this.cache = new LRUCache<string, FmsFile>({ max: maxCacheSize });
        this._filters = filters;
        this.sortOrder = sortOrder;
        this.fileService = fileService;

        this.fetchFileRange = this.fetchFileRange.bind(this);
        this.isFileMetadataLoaded = this.isFileMetadataLoaded.bind(this);
    }

    public get files() {
        return this.cache;
    }

    public get filters() {
        return this._filters;
    }

    /**
     * "hash" takes into account a FileSet's:
     *  - filters
     *  - applied sorting
     *  - the data source for the files (i.e., base url of file service)
     *
     * It can be used to force a replacement of a React component (versus an update) that depends on a FileSet
     * by using this as the component's `key` attribute.
     */
    public get hash() {
        return `${this.toQueryString()}:${this.fileService.baseUrl}`;
    }

    public get totalCount() {
        return this.totalFileCount;
    }

    public getFileByIndex(index: number) {
        const correspondingFileId = this._fileIds[index];
        if (!correspondingFileId) {
            return undefined;
        }

        return this.cache.get(correspondingFileId);
    }

    /**
     * Fetch metadata for a range of files from within the result set this query corresponds to.
     *
     * ! SIDE EFFECT !
     * Fetches file ids if they have not already been fetched.
     */
    public async fetchFileRange(startIndex: number, endIndex: number) {
        try {
            if (!isPromise(this.loaded)) {
                this.fetchFileIds();
            }

            await this.loaded;

            const { limit, offset } = this.calculatePaginationFromIndices(startIndex, endIndex);
            const response = await this.fileService.getFiles({
                from: offset,
                limit,
                queryString: this.toQueryString(),
                startIndex,
                endIndex,
            });

            response.data.forEach((file: FmsFile) => {
                this.cache.set(file.fileId, file);
            });

            this.totalFileCount = response.totalCount;
            return response.data;
        } catch (e) {
            // TODO retry logic
            console.error(e);
        }
    }

    /**
     * Return list of all file ids corresponding to this FileSet.
     *
     * ! SIDE EFFECT !
     * Fetches file ids if they have not already been fetched.
     */
    public async fileIds() {
        if (!isPromise(this.loaded)) {
            this.fetchFileIds();
        }

        try {
            await this.loaded;
        } catch (e) {
            // TODO retry logic
            console.error(e);
        }

        return this._fileIds;
    }

    public isFileMetadataLoaded(index: number) {
        const correspondingFileId = this._fileIds[index];
        if (!correspondingFileId) {
            return false;
        }

        return this.cache.has(correspondingFileId);
    }

    /**
     * Combine filters and sortOrder into a single query string that can be sent to a query service.
     */
    public toQueryString(): string {
        return join(
            flatten([
                map(this._filters, (filter) => filter.toQueryString()),
                map(this.sortOrder, (sortBy) => sortBy.toQueryString()),
            ]),
            "&"
        );
    }

    /**
     * Fetch list of all file ids corresponding to this FileSet.
     *
     * ! SIDE EFFECT !
     * Stores Promise as a loading indicator, which allows code to `await this.loaded.`
     */
    private async fetchFileIds() {
        this.loaded = this.fileService.getFileIds({ queryString: this.toQueryString() });
        this._fileIds = await this.loaded;
    }

    /**
     * Best-effort (iterative) calculation of limit (page size) and offest (page number).
     * There's no guarantee that the limit and offset returned will fully cover the requested indices.
     */
    private calculatePaginationFromIndices(start: number, end: number) {
        const difference = end - start + 1;

        // if start is an even multiple of difference, the calculation is direct
        if (start % difference === 0) {
            return {
                offset: start / difference,
                limit: difference,
            };
        }

        // otherwise, iteratively figure it out
        let limit = difference;
        let offset = Math.floor(start / limit);

        const paginationEncompassesIndices = () => {
            const encompassesLowerIndex = offset * limit <= start;
            const encompassesUpperIndex = offset * limit + limit >= end;
            return encompassesLowerIndex && encompassesUpperIndex;
        };

        const MAX_ITERATIONS = 100; // totally arbitrary, just don't want this to iterate forever
        let iteration = 0;
        while (iteration++ < MAX_ITERATIONS && !paginationEncompassesIndices()) {
            limit += 1;
            offset = Math.floor(start / limit);
        }

        // wherever this ends up when the iteration is complete, return
        return {
            offset,
            limit,
        };
    }
}
