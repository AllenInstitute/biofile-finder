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
    private cache: LRUCache<number, FmsFile>;
    private _fileIds: string[] = [];
    private readonly fileService: FileService;
    private readonly filters: FileFilter[];
    private loaded: Promise<string[]> | undefined;
    private readonly sortOrder: FileSort[];
    private totalFileCount: number | undefined;

    constructor(opts: Partial<Opts> = {}) {
        const { fileService, filters, maxCacheSize, sortOrder } = defaults({}, opts, DEFAULT_OPTS);

        this.cache = new LRUCache<number, FmsFile>({ max: maxCacheSize });
        this.filters = filters;
        this.sortOrder = sortOrder;
        this.fileService = fileService;

        this.fetchFileRange = this.fetchFileRange.bind(this);
        this.isFileMetadataLoaded = this.isFileMetadataLoaded.bind(this);
    }

    public get files() {
        return this.cache;
    }

    public get totalCount() {
        return this.totalFileCount;
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

            const fromId = this._fileIds[startIndex];
            const limit = endIndex - startIndex;
            const response = await this.fileService.getFiles({
                fromId,
                limit,
                queryString: this.toQueryString(),
                startIndex,
                endIndex,
            });

            response.data.forEach((file: FmsFile) => {
                this.cache.set(file.file_index, file);
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
        return this.cache.has(index);
    }

    /**
     * Combine filters and sortOrder into a single query string that can be sent to a query service.
     */
    public toQueryString(): string {
        return join(
            flatten([
                map(this.filters, (filter) => filter.toQueryString()),
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
}
