import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import FileSelection from "../entity/FileSelection";
import FileSet from "../entity/FileSet";
import NumericRange from "../entity/NumericRange";
import { CanceledError } from "../errors";
import { interaction, selection } from "../state";
import { processError } from "../state/interaction/actions";

export default function useFilteredSelection() {
    const dispatch = useDispatch();
    const defaultSelection = useSelector(
        selection.selectors.getFileSelection,
        FileSelection.selectionsAreEqual
    );
    const filters = useSelector(interaction.selectors.getFileFiltersForVisibleModal);
    const fileService = useSelector(interaction.selectors.getFileService);
    const sortColumn = useSelector(selection.selectors.getSortColumn);

    const [filteredSelection, setFilteredSelection] = React.useState(defaultSelection);

    React.useEffect(() => {
        let cancelFn: ((reason?: string | undefined) => void) | undefined;
        // Fetch the file selection that matches
        if (filters.length) {
            const fetchAndSetSelection = async () => {
                const fileSet = new FileSet({
                    filters,
                    fileService,
                    sort: sortColumn,
                });
                const { promise, cancel } = fileSet.fetchTotalCount();
                cancelFn = cancel;
                try {
                    const count = await promise;
                    setFilteredSelection(
                        new FileSelection([
                            {
                                selection: new NumericRange(0, count - 1),
                                fileSet,
                                sortOrder: 0,
                            },
                        ])
                    );
                } catch (err) {
                    // Swallow cancellation errors
                    if (!(err instanceof CanceledError)) {
                        dispatch(processError("use-filtered-selection", (err as Error).message));
                    }
                }
            };
            fetchAndSetSelection();
        } else {
            // default to default selection if no filters
            setFilteredSelection(defaultSelection);
        }
        // Clean up by canceling stale query on dep change
        return () => cancelFn?.(); // noop if cancel is still undefined
    }, [filters, sortColumn, fileService, defaultSelection, dispatch]);

    return filteredSelection;
}
