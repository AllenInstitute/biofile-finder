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

/**
 * Represents the filters and applied sorting that together produce a set of files from FMS. Note that the same set of
 * file filters with a different sort order is a different FileSet.
 *
 * Responsible for loading the metadata for files that will be displayed in the file list.
 */
export default class FileSet {
    private cache: LRUCache<number, FmsFile>;
    private readonly fileService: FileService;
    private readonly _filters: FileFilter[];
    private readonly sortOrder: FileSort[];
    private totalFileCount: number | undefined;

    constructor(opts: Partial<Opts> = {}) {
        const { fileService, filters, maxCacheSize, sortOrder } = defaults({}, opts, DEFAULT_OPTS);

        this.cache = new LRUCache<number, FmsFile>({ max: maxCacheSize });
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

    public async fetchTotalCount() {
        if (this.totalFileCount === undefined) {
            this.totalFileCount = await this.fileService.getCountOfMatchingFiles(
                this.toQueryString()
            );
        }

        return this.totalFileCount;
    }

    public getFileByIndex(index: number) {
        return this.cache.get(index);
    }

    /**
     * Fetch metadata for a range of files from within the result set this query corresponds to.
     */
    public async fetchFileRange(startIndex: number, endIndex: number) {
        const { response, offset, limit } = await this.fileService.getFilesByIndices(
            startIndex,
            endIndex,
            this.toQueryString()
        );

        // Because of how pagination is implemented, it is not guaranteed that the start index for the requested range of files will
        // in fact be the start index of the page of data returned. Pages are designed to be inclusive of the requested range, but
        // may overfetch.
        const startIndexOfPage = offset * limit;
        for (let i = 0; i < response.data.length; i++) {
            this.cache.set(startIndexOfPage + i, response.data[i]);
        }

        this.totalFileCount = response.totalCount;
        return response.data;
    }

    public isFileMetadataLoaded(index: number) {
        return this.cache.get(index) !== undefined;
    }

    /**
     * Combine filters and sortOrder into a single query string that can be sent to a query service.
     */
    public toQueryString(): string {
        // filters must be sorted in order to ensure requests can be effectively cached
        // according to their url
        const sortedFilters = [...this.filters].sort((a, b) =>
            a.toQueryString().localeCompare(b.toQueryString())
        );
        return join(
            flatten([
                map(sortedFilters, (filter) => filter.toQueryString()),
                map(this.sortOrder, (sortBy) => sortBy.toQueryString()),
            ]),
            "&"
        );
    }

    public toString(): string {
        return `FileSet(${this.toQueryString()})`;
    }
}
