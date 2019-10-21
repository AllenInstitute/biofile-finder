import { defaults } from "lodash";
import * as LRUCache from "lru-cache";
import * as React from "react";

import RestServiceResponse from "../entity/RestServiceResponse";

export interface FmsFile {
    [key: string]: any;
    file_id: string;
    // Index within the filtered result set this file was requested as a part of; global within the full set, not just
    // the paginated set returned from a single API call. Important to our ability to present a windowed list.
    file_index: number;
}

interface Opts {
    maxCacheSize?: number;
}

const defaultOpts: Opts = {
    maxCacheSize: 1000,
};

// This is an arbitrary value that will be immediately updated, but needs to be set to some number > 0 in order to
// prompt react-window-infinite-loader to start calling `fetchFiles`.
const INITIAL_TOTAL_COUNT = 1000;

/**
 * Custom React hook to accomplish storing and fetching ranges of files in FMS.
 */
export default function useFileFetcher(
    opts?: Opts
): [LRUCache<number, FmsFile>, number, (start: number, end: number) => Promise<void>] {
    const { maxCacheSize } = defaults(opts, defaultOpts);
    const [files, setFiles] = React.useState(
        () => new LRUCache<number, FmsFile>({ max: maxCacheSize })
    );
    const [totalCount, setTotalCount] = React.useState(INITIAL_TOTAL_COUNT);

    const fetchFiles = async (startIndex: number, endIndex: number) => {
        // Provisionally request from file until FMS File Explorer Query Service exists. Wait for it to simulate a
        // network request.
        const response = await new Promise<RestServiceResponse>((resolve) => {
            setTimeout(() => {
                const res = require("../../assets/data-0.json");
                // In a real API call this will be unnecessary, but until then, need to grab just the subset of
                // data requested.
                const requestedRange = res.data.slice(startIndex, endIndex + 1);
                resolve(new RestServiceResponse({ ...res, data: requestedRange }));
            }, 750);
        });

        response.data.forEach((file: FmsFile) => {
            files.set(file.file_index, file);
        });
        setFiles(files);
        setTotalCount(response.totalCount);
    };

    return [files, totalCount, fetchFiles];
}
