import * as React from "react";
import { useSelector } from "react-redux";

import { interaction, selection } from "../../../state";
import FileSelection from "../../../entity/FileSelection";
import FileSet from "../../../entity/FileSet";
import NumericRange from "../../../entity/NumericRange";

export default function useFilteredSelection() {
    const defaultSelection = useSelector(
        selection.selectors.getFileSelection,
        FileSelection.selectionsAreEqual
    );
    const filters = useSelector(interaction.selectors.getFileFiltersForVisibleModal);
    const fileService = useSelector(interaction.selectors.getFileService);
    const sortColumn = useSelector(selection.selectors.getSortColumn);

    const [filteredSelection, setFilteredSelection] = React.useState(defaultSelection);

    React.useEffect(() => {
        // Fetch the file selection that matches
        if (filters.length) {
            const fetchAndSetSelection = async () => {
                const fileSet = new FileSet({
                    filters,
                    fileService,
                    sort: sortColumn,
                });
                const count = await fileSet.fetchTotalCount();
                setFilteredSelection(
                    new FileSelection([
                        {
                            selection: new NumericRange(0, count - 1),
                            fileSet,
                            sortOrder: 0,
                        },
                    ])
                );
            };
            fetchAndSetSelection();
        } else {
            // default to default selection if no filters
            setFilteredSelection(defaultSelection);
        }
    }, [filters, sortColumn, fileService]);

    return filteredSelection;
}
