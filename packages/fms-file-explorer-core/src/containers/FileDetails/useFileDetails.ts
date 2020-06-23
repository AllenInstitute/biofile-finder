import { defaults, isUndefined } from "lodash";
import * as LRUCache from "lru-cache";
import * as React from "react";

import FileDetail from "../../entity/FileDetail";
import FileSet from "../../entity/FileSet";

interface Opts {
    maxCacheSize?: number;
}

const defaultOpts: Opts = {
    maxCacheSize: 100,
};

/**
 * Custom React hook to accomplish storing and fetching details of files (i.e., complex file metadata). Implements a
 * pass-thru LRU cache that will hold on to `opts.maxCacheSize` details for files; if metadata for a file is missing
 * in the cache, a network request will be made to request it. This hook additionally exposes loading state for the
 * requested fileId. If a network request is in flight for file details for the requested fileId, the second element of
 * the return array will be true.
 */
export default function useFileDetails(
    fileIndex: number | undefined,
    fileSet: FileSet | undefined,
    opts?: Opts
): [FileDetail | undefined, boolean] {
    const { maxCacheSize } = defaults(opts, defaultOpts);
    const [detailsCache, setDetailsCache] = React.useState(
        () => new LRUCache<string, FileDetail>({ max: maxCacheSize }) // fileId to fileDetail
    );
    const [isLoading, setIsLoading] = React.useState(false);
    // Create Key for accessing the cache for this file
    const fileIndexKey = `${fileIndex}-${fileSet && fileSet.hash}`;

    React.useEffect(() => {
        // This tracking variable allows us to avoid a call to setDetailsCache (which triggers a re-render) if the
        // effect is rerun prior to a successful network response. This could be the case if a user makes a file
        // selection then quickly makes a new selection.
        let ignoreResponse = false;
        // no selected file (fileId is undefined) or cache hit, nothing to do
        if (isUndefined(fileIndex) || isUndefined(fileSet) || detailsCache.has(fileIndexKey)) {
            // a previous request was cancelled
            if (isLoading) {
                setIsLoading(false);
            }

            // cache miss, check if file set cache has record of this index
        } else {
            const fileDetails = fileSet.getFileByIndex(fileIndex);
            if (fileDetails) {
                const detail = new FileDetail(fileDetails);
                setDetailsCache((prevCache) => {
                    const nextCache = new LRUCache<string, FileDetail>({
                        max: maxCacheSize,
                    });
                    nextCache.load(prevCache.dump());
                    nextCache.set(fileIndexKey, detail);
                    return nextCache;
                });

                // both caches miss the record, make a network request
            } else {
                setIsLoading(true);
                fileSet
                    .fetchFileRange(fileIndex, fileIndex)
                    .then((response) => {
                        if (!ignoreResponse) {
                            const detail = new FileDetail(response[0]);
                            setDetailsCache((prevCache) => {
                                const nextCache = new LRUCache<string, FileDetail>({
                                    max: maxCacheSize,
                                });
                                nextCache.load(prevCache.dump());
                                nextCache.set(fileIndexKey, detail);
                                return nextCache;
                            });
                        }
                    })
                    .catch(console.error)
                    .finally(() => {
                        if (!ignoreResponse) {
                            setIsLoading(false);
                        }
                    });
                setIsLoading(false);
            }
        }

        return function cleanup() {
            ignoreResponse = true;
        };
    }, [fileIndex, fileSet, fileIndexKey, detailsCache, isLoading, maxCacheSize]);

    const fileDetails = isUndefined(fileIndex) ? undefined : detailsCache.get(fileIndexKey);
    React.useDebugValue(fileDetails); // display fileDetails in React DevTools when this hook is inspected

    return [fileDetails, isLoading];
}
