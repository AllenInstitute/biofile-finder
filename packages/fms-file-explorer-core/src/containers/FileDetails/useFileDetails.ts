import { defaults, isUndefined } from "lodash";
import * as LRUCache from "lru-cache";
import * as React from "react";

import FileDetail, { FileDetailResponse } from "../../entity/FileDetail";
import { makeFileDetailMock } from "../../entity/FileDetail/mocks";
import RestServiceResponse from "../../entity/RestServiceResponse";

interface Opts {
    maxCacheSize?: number;
}

const defaultOpts: Opts = {
    maxCacheSize: 100,
};

function fetchDetailsFromNetwork(fileId: string): Promise<RestServiceResponse<FileDetailResponse>> {
    return new Promise((resolve) => {
        // Fake asynchrony to more closely match a network request.
        setTimeout(() => {
            resolve(
                new RestServiceResponse({
                    data: [makeFileDetailMock(fileId)],
                    hasMore: false,
                    offset: 0,
                    responseType: "SUCCESS",
                    totalCount: 1,
                })
            );
        }, 750);
    });
}

/**
 * Custom React hook to accomplish storing and fetching details of files (i.e., complex file metadata). Implements a
 * pass-thru LRU cache that will hold on to `opts.maxCacheSize` details for files; if metadata for a file is missing
 * in the cache, a network request will be made to request it. This hook additionally exposes loading state for the
 * requested fileId. If a network request is in flight for file details for the requested fileId, the second element of
 * the return array will be true.
 */
export default function useFileDetails(
    fileId: string | undefined,
    opts?: Opts
): [FileDetail | undefined, boolean] {
    const { maxCacheSize } = defaults(opts, defaultOpts);
    const [detailsCache, setDetailsCache] = React.useState(
        () => new LRUCache<string, FileDetail>({ max: maxCacheSize }) // fileId to fileDetail
    );
    const [isLoading, setIsLoading] = React.useState(false);

    React.useEffect(() => {
        // This tracking variable allows us to avoid a call to setDetailsCache (which triggers a re-render) if the
        // effect is rerun prior to a successful network response. This could be the case if a user makes a file
        // selection then quickly makes a new selection.
        let ignoreResponse = false;

        // no selected file (fileId is undefined) or cache hit, nothing to do
        if (isUndefined(fileId) || detailsCache.has(fileId)) {
            // a previous request was cancelled
            if (isLoading) {
                setIsLoading(false);
            }

            // cache miss, make network request and store in cache
        } else {
            setIsLoading(true);
            fetchDetailsFromNetwork(fileId)
                .then((response) => {
                    if (!ignoreResponse) {
                        const detail = new FileDetail(response.data[0]);
                        setDetailsCache((cache) => {
                            cache.set(detail.id, detail);
                            return cache;
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
    }, [fileId, isLoading]);

    const fileDetails = isUndefined(fileId) ? fileId : detailsCache.get(fileId);
    React.useDebugValue(fileDetails); // display fileDetails in React DevTools when this hook is inspected

    return [fileDetails, isLoading];
}
