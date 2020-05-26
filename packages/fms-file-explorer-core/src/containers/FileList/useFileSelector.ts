import * as React from "react";
import { useDispatch } from "react-redux";

import { selection } from "../../state";
import FileSet from "../../entity/FileSet";

export interface EventParams {
    ctrlKeyIsPressed: boolean;
    shiftKeyIsPressed: boolean;
}

export interface OnSelect {
    (fileRow: { index: number; id: string }, eventParams: EventParams): void;
}

const MAX_FILES_IN_BATCH = 250; // Manually tuned batch size

/**
 * Custom React hook for dealing with file selection.
 *
 * File selection is complicated by the virtualization and lazy loading of file lists. Because we don't know file ids
 * for each file in each list ahead of time, bulk selection (e.g., selecting all files in a "folder" and range selection)
 * presumably would need to rely on row indices. But because file lists are sortable, index positions are not stable, so
 * we in fact need to know the file id of each selected file.
 *
 * This hook contains all logic for working with indices of items in the virtualized, lazily loaded file list, mapping
 * them to file ids, and telling Redux about the user interaction. It returns an `onSelect` handler to be passed to each
 * row. It handles logic for mapping user interactions like ctrl clicking (modify existing selection) and shift
 * clicking (bulk selection).
 */
export default function useFileSelector(
    fileSet: FileSet
): { onSelect: OnSelect; isLoading: boolean } {
    const dispatch = useDispatch();
    const [lastSelectedFileIndex, setLastSelectedFileIndex] = React.useState<undefined | number>(
        undefined
    );
    const [isLoading, setIsLoading] = React.useState<boolean>(false);

    // To be called as an `onSelect` callback by individual FileRows.
    const onSelect = React.useCallback(
        async (fileRow: { index: number; id: string }, eventParams: EventParams) => {
            if (eventParams.shiftKeyIsPressed) {
                const rangeBoundary =
                    lastSelectedFileIndex === undefined ? fileRow.index : lastSelectedFileIndex;
                const startIndex = Math.min(rangeBoundary, fileRow.index);
                const endIndex = Math.max(rangeBoundary, fileRow.index);
                const rangesToFetch = [];

                // This is an unusual for-loop. It does not have a "final-expression" to update the loop counter
                // because it may jump dramatically between iterations; the loop body itself has the responsibility of incrementing
                // the loop counter.
                for (let i = startIndex; i <= endIndex; ) {
                    if (!fileSet.isFileMetadataLoaded(i)) {
                        // Do not have the file representation loaded, so fetch files from `i` up to `i + MAX_FILES_IN_BATCH` files.
                        // This has the possibility of overfetching data, but with an optimally tuned MAX_FILES_IN_BATCH, this shouldn't matter much.
                        const fileRangeEndBound =
                            endIndex - i <= MAX_FILES_IN_BATCH ? endIndex : i + MAX_FILES_IN_BATCH;
                        rangesToFetch.push([i, fileRangeEndBound]);
                        i = fileRangeEndBound + 1;
                    } else {
                        // Already have the file representation loaded; go to the next index within the range selection
                        i++;
                    }
                }

                setIsLoading(true);
                try {
                    const fileRangeRequests = rangesToFetch.map(([start, end]) =>
                        fileSet.fetchFileRange(start, end)
                    );
                    await Promise.all(fileRangeRequests);

                    const selections: string[] = [];
                    for (let i = startIndex; i <= endIndex; i++) {
                        const file = fileSet.getFileByIndex(i);
                        if (file) {
                            selections.push(file.fileId);
                        }
                    }

                    dispatch(
                        selection.actions.selectFile(selections, eventParams.ctrlKeyIsPressed)
                    );
                } catch (exc) {
                    console.error(
                        "Failed to fetch files necessary in order to perform range selection",
                        exc
                    );
                } finally {
                    setIsLoading(false);
                }
            } else {
                setLastSelectedFileIndex(fileRow.index);
                dispatch(selection.actions.selectFile(fileRow.id, eventParams.ctrlKeyIsPressed));
            }
        },
        [dispatch, fileSet, lastSelectedFileIndex, setIsLoading]
    );

    return {
        onSelect,
        isLoading,
    };
}
