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
                    const fileIds = await fileSet.fileIds();
                    const fileId = fileIds[fileRow.index];

                    if (fileId === undefined) {
                        return;
                    }

                    const rangeBoundary = isUndefined(lastSelectedFileIndex)
                        ? fileRow.index
                        : lastSelectedFileIndex;
                    const startIndex = Math.min(rangeBoundary, fileRow.index);
                    const endIndex = Math.max(rangeBoundary, fileRow.index);
                    const selections = fileIds.slice(startIndex, endIndex + 1); // end not inclusive
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
                // TODO
            }
        },
        [dispatch, fileSet, lastSelectedFileIndex]
    );
}
