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
                const selections = [];
                let error = null;
                for (let i = startIndex; i <= endIndex; i++) {
                    // Ensure we have the file representation loaded
                    if (!fileSet.isFileMetadataLoaded(i)) {
                        const MAX_FILES_TO_FETCH = 1000;
                        const fileRangeEndBound =
                            endIndex - i <= MAX_FILES_TO_FETCH ? endIndex : i + MAX_FILES_TO_FETCH;
                        try {
                            // Use functional update form to prevent re-render if isLoading is already true
                            setIsLoading(() => true);
                            await fileSet.fetchFileRange(i, fileRangeEndBound);
                        } catch (err) {
                            // TODO tell user about error?
                            error = err;
                            console.error(
                                "Failed to fetch files necessary in order to perform range selection",
                                err
                            );
                            break;
                        }
                    }

                    const file = fileSet.getFileByIndex(i);

                    // While, according to the compiler, file could theoretically be undefined, the above
                    // FileSet::isFileMetadataLoaded check and code path ensures the file will be present
                    if (file) {
                        selections.push(file.fileId);
                    }
                }

                // A loading flag may have been set in the course of determining file ids of selected files;
                // clear before moving on.
                // Use functional update form to prevent re-render if isLoading is already false
                setIsLoading(() => false);

                if (error) {
                    return;
                }

                dispatch(selection.actions.selectFile(selections, eventParams.ctrlKeyIsPressed));
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
