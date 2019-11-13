import { defaults, flatten, join, map } from "lodash";
import * as LRUCache from "lru-cache";

import FileFilter from "../FileFilter";
import FileSort from "../FileSort";
import FileService, { FmsFile } from "../FileService";

interface Opts {
    maxCacheSize?: number;
}

const defaultOpts: Partial<Opts> = {
    maxCacheSize: 1000,
};

/**
 * Represents the filters and applied sorting that together produce a set of files from FMS. Note that the same set of
 * file filters with a different sort order is a different FileSet.
 *
 * Contains all logic for fetching the set of file_ids that corresponds to the filters/sort order as well as loading
 */
export default class FileSet {
    public fileIdsHaveFetched!: Promise<void>;

    private cache: LRUCache<number, FmsFile>;
    private fileIds: string[] = [];
    private readonly fileService: FileService;
    private readonly filters: FileFilter[];
    private readonly sortOrder: FileSort[];
    private totalFileCount: number = 1000;

    constructor(
        fileService: FileService,
        filters: FileFilter[] = [],
        sortOrder: FileSort[] = [],
        opts?: Opts
    ) {
        const { maxCacheSize } = defaults(opts, defaultOpts);

        this.cache = new LRUCache<number, FmsFile>({ max: maxCacheSize });
        this.fileService = fileService;
        this.filters = filters;
        this.sortOrder = sortOrder;

        this.fetchFiles = this.fetchFiles.bind(this);
        this.isLoaded = this.isLoaded.bind(this);

        // kick off request for all file ids in the result set represented by this query
        // store Promise as a loading indicator; allows code to `await this.fileIdsHaveFetched`
        this.fileIdsHaveFetched = this.fetchFileIds();
    }

    public get ids() {
        return this.fileIds;
    }

    public get files() {
        return this.cache;
    }

    public get totalCount() {
        return this.totalFileCount;
    }

    public isLoaded(index: number) {
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
     * Fetch range of files from within the result set this query corresponds to.
     */
    public async fetchFiles(startIndex: number, endIndex: number) {
        try {
            await this.fileIdsHaveFetched;

            const fromId = this.fileIds[startIndex];
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
     * Fetch list of all file_ids for entire set of FMS files this query corresponds to.
     */
    private async fetchFileIds() {
        this.fileIds = await this.fileService.getFileIds({ queryString: this.toQueryString() });
    }
}
