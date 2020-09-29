import { defaults, find, flatten, join, map } from "lodash";
import LRUCache from "lru-cache";

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

    public static isFileSet(candidate: any): candidate is FileSet {
        return candidate instanceof FileSet;
    }

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
        const { limit, offset } = this.calculatePaginationFromIndices(startIndex, endIndex);
        const response = await this.fileService.getFiles({
            from: offset,
            limit,
            queryString: this.toQueryString(),
        });

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

    public equals(other: FileSet): boolean {
        if (this === other) {
            return true;
        }

        return this.hash === other.hash;
    }

    /**
     * Does this FileSet contain the given filters?
     */
    public matches(filters: FileFilter[]): boolean {
        return filters.every((filter) => {
            const found = find(this.filters, (f) => f.equals(filter));
            return !!found;
        });
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

    public toJSON() {
        return {
            queryString: this.toQueryString(),
            baseUrl: this.fileService.baseUrl,
        };
    }

    public toString(): string {
        return `FileSet(${this.toQueryString()})`;
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
    private calculatePaginationFromIndices(start: number, end: number) {
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
