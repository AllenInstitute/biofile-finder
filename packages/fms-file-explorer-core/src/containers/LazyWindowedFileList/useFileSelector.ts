import { isUndefined } from "lodash";
import * as React from "react";
import { useDispatch } from "react-redux";

import { selection } from "../../state";
import FileSet from "../../entity/FileSet/index";

export interface EventParams {
    ctrlKeyIsPressed: boolean;
    shiftKeyIsPressed: boolean;
}

export interface OnSelect {
    (fileRow: { index: number; id: string }, eventParams: EventParams): void;
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
export default function useFileSelector(fileSet: FileSet): OnSelect {
    const dispatch = useDispatch();
    const [lastSelectedFileIndex, setLastSelectedFileIndex] = React.useState<undefined | number>(
        undefined
    );

    // To be called as an `onSelect` callback by individual FileRows.
    return React.useCallback(
        async (fileRow: { index: number; id: string }, eventParams: EventParams) => {
            try {
                if (eventParams.shiftKeyIsPressed) {
                    await fileSet.fileIdsHaveFetched;
                    const fileId = fileSet.ids[fileRow.index];

                    if (fileId === undefined) {
                        return;
                    }

                    const rangeBoundary = isUndefined(lastSelectedFileIndex)
                        ? fileRow.index
                        : lastSelectedFileIndex;
                    const startIndex = Math.min(rangeBoundary, fileRow.index);
                    const endIndex = Math.max(rangeBoundary, fileRow.index);
                    const selections = fileSet.ids.slice(startIndex, endIndex + 1); // end not inclusive
                    dispatch(
                        selection.actions.selectFile(selections, eventParams.ctrlKeyIsPressed)
                    );
                } else {
                    setLastSelectedFileIndex(fileRow.index);
                    dispatch(
                        selection.actions.selectFile(fileRow.id, eventParams.ctrlKeyIsPressed)
                    );
                }
            } catch (e) {
                // Attempted to select a file before fileIds have loaded
            }
        },
        [dispatch, fileSet, lastSelectedFileIndex]
    );
}
