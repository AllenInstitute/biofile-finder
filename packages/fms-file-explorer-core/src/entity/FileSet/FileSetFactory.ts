import * as LRUCache from "lru-cache";

import FileService from "../../services/FileService";
import FileFilter from "../FileFilter";
import FileSet from "../FileSet";

const MAX_CACHE_SIZE = 20; // arbitrary; no need for this to be particularly large

/**
 * This is a temporary workaround to prevent an issue with updating FileList components (which take FileSets as props).
 * This should be fixed more properly as part of https://aicsjira.corp.alleninstitute.org/browse/FMS-1017.
 */
export default class FileSetFactory {
    private cache = new LRUCache<string, FileSet>({ max: MAX_CACHE_SIZE });

    public create(params: { filters: FileFilter[]; fileService: FileService }): FileSet {
        const { filters, fileService } = params;
        const candidate = new FileSet({ fileService, filters });
        if (!this.cache.has(candidate.hash)) {
            this.cache.set(candidate.hash, candidate);
        }

        // we know this will return a FileSet and not undefined, so cast to avoid unnecessary typing error
        return this.cache.get(candidate.hash) as FileSet;
    }

    public get(hash: string): FileSet | undefined {
        return this.cache.get(hash);
    }
}

export const defaultFileSetFactory = new FileSetFactory();
