import { defaults, isUndefined } from "lodash";
import * as LRUCache from "lru-cache";
import * as React from "react";

import FileDetail, { FileDetailResponse } from "../../entity/FileDetail";
import { makeFileDetailMock } from "../../entity/FileDetail/mocks";
import RestServiceResponse from "../../entity/RestServiceResponse";
import FileService, { FmsFile } from "../../services/FileService";

interface Opts {
    maxCacheSize?: number;
}

const defaultOpts: Opts = {
    maxCacheSize: 100,
};

function fetchDetailsFromNetwork(
    fileIndex: number,
    fileSetHash: string,
    fileService: FileService
): Promise<RestServiceResponse<FmsFile>> {
    const { limit, offset } = calculatePaginationFromIndices(fileIndex, fileIndex);
    return fileService.getFiles({
        from: offset,
        limit,
        queryString: fileSetHash.split(":")[0],
    });
}

function calculatePaginationFromIndices(start: number, end: number) {
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

/**
 * Custom React hook to accomplish storing and fetching details of files (i.e., complex file metadata). Implements a
 * pass-thru LRU cache that will hold on to `opts.maxCacheSize` details for files; if metadata for a file is missing
 * in the cache, a network request will be made to request it. This hook additionally exposes loading state for the
 * requested fileId. If a network request is in flight for file details for the requested fileId, the second element of
 * the return array will be true.
 */
export default function useFileDetails(
    fileIndex: number | undefined,
    fileSetHash: string | undefined,
    fileService: FileService,
    opts?: Opts
): [FileDetail | undefined, boolean] {
    const { maxCacheSize } = defaults(opts, defaultOpts);
    const [detailsCache, setDetailsCache] = React.useState(
        () => new LRUCache<string, FileDetail>({ max: maxCacheSize }) // fileId to fileDetail
    );
    const [isLoading, setIsLoading] = React.useState(false);
    const fileIndexKey = `${fileIndex}-${fileSetHash}`;

    React.useEffect(() => {
        // This tracking variable allows us to avoid a call to setDetailsCache (which triggers a re-render) if the
        // effect is rerun prior to a successful network response. This could be the case if a user makes a file
        // selection then quickly makes a new selection.
        let ignoreResponse = false;
        // no selected file (fileId is undefined) or cache hit, nothing to do
        if (isUndefined(fileIndex) || isUndefined(fileSetHash) || detailsCache.has(fileIndexKey)) {
            // a previous request was cancelled
            if (isLoading) {
                setIsLoading(false);
            }

            // cache miss, make network request and store in cache
        } else {
            setIsLoading(true);
            fetchDetailsFromNetwork(fileIndex, fileSetHash, fileService)
                .then((response) => {
                    if (!ignoreResponse) {
                        const detail = new FileDetail(response.data[0]);
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
        }

        return function cleanup() {
            ignoreResponse = true;
        };
    }, [fileIndexKey, detailsCache, isLoading, maxCacheSize]);

    const fileDetails = isUndefined(fileIndexKey) ? fileIndexKey : detailsCache.get(fileIndexKey);
    React.useDebugValue(fileDetails); // display fileDetails in React DevTools when this hook is inspected

    return [fileDetails, isLoading];
}
