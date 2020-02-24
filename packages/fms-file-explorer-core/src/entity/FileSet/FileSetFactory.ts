import * as LRUCache from "lru-cache";

import FileService from "../../services/FileService";
import FileFilter from "../FileFilter";
import FileSet from "../FileSet";

const MAX_CACHE_SIZE = 20; // arbitrary; no need for this to be particularly large

export default class FileSetFactory {
    private cache = new LRUCache<String, FileSet>({ max: MAX_CACHE_SIZE });

    public create(params: { filters: FileFilter[]; fileService: FileService }): FileSet {
        const { filters, fileService } = params;
        const candidate = new FileSet({ fileService, filters });
        if (!this.cache.has(candidate.toQueryString())) {
            this.cache.set(candidate.toQueryString(), candidate);
        }

        // we know this will return a FileSet and not undefined, so cast to avoid unnecessary typing error
        return this.cache.get(candidate.toQueryString()) as FileSet;
    }
}

export const defaultFileSetFactory = new FileSetFactory();
