import { isUndefined } from "lodash";
import * as React from "react";
import { useDispatch } from "react-redux";

import { selection } from "../../state";
import RestServiceResponse from "../../entity/RestServiceResponse";

interface EventParams {
    ctrlKeyIsPressed: boolean;
    shiftKeyIsPressed: boolean;
}

export interface OnSelect {
    (index: number, eventParams: EventParams): void;
}

interface OnReceiveFileIds {
    (res: string[]): void;
}

async function getFileIds(cb: OnReceiveFileIds) {
    let page = 0;

    const fetch = (): Promise<RestServiceResponse<string>> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log(`Requesting file ids from page ${page}`);
                const res = require(`../../../assets/file-ids-${page}.json`);
                page += 1;
                resolve(new RestServiceResponse(res));
            }, 750);
        });
    };

    const fileIds: string[] = [];
    let res = await fetch();
    res.data.forEach((id) => fileIds.push(id));
    while (res.hasMore) {
        res = await fetch();
        res.data.forEach((id) => fileIds.push(id));
    }

    cb(fileIds);
}

/**
 * Custom React hook for dealing with file selection.
 *
 * File selection is complicated by the virtualization and lazy loading of the file list; we don't know file ids for each
 * file in the list ahead of time, so bulk selection (including range selection) presumably would need to rely on row
 * indices. But because file lists are sortable, index positions are not stable, so we in fact need to know the file id
 * of each selected file.
 *
 * This hook contains all logic for working with indices of items in the virtualized, lazily loaded and mapping them to
 * file ids. It returns a list with the following values:
 *  1. an `onSelect` handler to be passed to each row. It handles logic for mapping user interactions like ctrl clicking
 *      (modify existing selection) and shift clicking (bulk selection).
 *  2. a boolean indicating whether file_ids are currently loading
 */
export default function useFileSelector(): [OnSelect, boolean] {
    const dispatch = useDispatch();
    const [lastSelectedFileIndex, setLastSelectedFileIndex] = React.useState<undefined | number>(
        undefined
    );
    const [fileIds, setFileIds] = React.useState<string[]>(() => []);
    const [fileIdsAreLoading, setFileIdsAreLoading] = React.useState(false);

    React.useEffect(() => {
        setFileIdsAreLoading(true);
        getFileIds((ids) => {
            setFileIds(ids);
            setFileIdsAreLoading(false);
        });
    }, [setFileIds, setFileIdsAreLoading]); // TODO, also parameterize by filters and applied sorting

    // To be called as an `onSelect` callback by individual FileRows.
    const onSelect = React.useCallback(
        (index: number, eventParams: EventParams) => {
            const fileId = fileIds[index];

            if (fileId === undefined) {
                return;
            }

            if (eventParams.shiftKeyIsPressed) {
                const rangeBoundary = isUndefined(lastSelectedFileIndex)
                    ? index
                    : lastSelectedFileIndex;
                const startIndex = Math.min(rangeBoundary, index);
                const endIndex = Math.max(rangeBoundary, index);
                const selections = fileIds.slice(startIndex, endIndex + 1); // end not inclusive
                dispatch(selection.actions.selectFile(selections, eventParams.ctrlKeyIsPressed));
            } else {
                setLastSelectedFileIndex(index);
                dispatch(selection.actions.selectFile(fileId, eventParams.ctrlKeyIsPressed));
            }
        },
        [dispatch, fileIds, lastSelectedFileIndex]
    );

    return [onSelect, fileIdsAreLoading];
}
