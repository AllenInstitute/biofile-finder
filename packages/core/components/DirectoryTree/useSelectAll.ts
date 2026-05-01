import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import FileFilter, { FilterType } from "../../entity/FileFilter";
import FileSet from "../../entity/FileSet";
import NumericRange from "../../entity/NumericRange";
import { interaction, selection } from "../../state";

/**
 * React hook that registers a Ctrl+A / Cmd+A keyboard shortcut to select all
 * files within the last-opened folder.
 *
 * Behavior:
 * - If there is no annotation hierarchy (flat list), selects all files in the
 *   root file set.
 * - If there is an annotation hierarchy, selects all files in the folder the
 *   user most recently selected a file within — but only if that folder
 *   is still present in `openFileFolders`. Does nothing otherwise.
 * - No-ops while a modal overlay is visible (consistent with arrow-key behavior).
 */
export default function useSelectAll() {
    const dispatch = useDispatch();
    const fileService = useSelector(interaction.selectors.getFileService);
    const globalFilters = useSelector(selection.selectors.getFileFilters);
    const sortColumn = useSelector(selection.selectors.getSortColumn);
    const visibleModal = useSelector(interaction.selectors.getVisibleModal);
    const annotationHierarchy = useSelector(selection.selectors.getAnnotationHierarchy);
    const lastTouchedFolder = useSelector(selection.selectors.getLastTouchedFolder);

    // Root file set (used for flat-list case)
    const rootFileSet = React.useMemo(
        () =>
            new FileSet({
                fileService,
                filters: globalFilters,
                sort: sortColumn,
            }),
        [fileService, globalFilters, sortColumn]
    );

    React.useEffect(() => {
        const onSelectAllKeyDown = async (event: KeyboardEvent) => {
            if (visibleModal) return;
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
                event.preventDefault();

                let targetFileSet: FileSet;

                if (annotationHierarchy.length === 0) {
                    // Flat list — no folder concept, always select all in root
                    targetFileSet = rootFileSet;
                } else if (lastTouchedFolder) {
                    // Rebuild the FileSet for the last-touched folder by combining
                    // the hierarchy filters (one per level from the folder path) with
                    // any non-hierarchy global filters the user may have applied.
                    const hierarchyFilters = annotationHierarchy.map(
                        (annotationName, idx) =>
                            new FileFilter(
                                annotationName,
                                lastTouchedFolder.fileFolder[idx],
                                FilterType.DEFAULT
                            )
                    );
                    const nonHierarchyFilters = globalFilters.filter(
                        (f) =>
                            !(annotationHierarchy.includes(f.name) && f.type === FilterType.DEFAULT)
                    );
                    targetFileSet = new FileSet({
                        fileService,
                        filters: [...hierarchyFilters, ...nonHierarchyFilters],
                        sort: sortColumn,
                    });
                } else {
                    // No last-touched folder or the folder has since been closed — do nothing
                    return;
                }

                const totalCount = await targetFileSet.fetchTotalCount();
                if (totalCount > 0) {
                    dispatch(
                        selection.actions.selectFile({
                            fileSet: targetFileSet,
                            selection: new NumericRange(0, totalCount - 1),
                            sortOrder: 0,
                            updateExistingSelection: false,
                        })
                    );
                }
            }
        };

        window.addEventListener("keydown", onSelectAllKeyDown, true);
        return () => window.removeEventListener("keydown", onSelectAllKeyDown, true);
    }, [
        annotationHierarchy,
        dispatch,
        fileService,
        globalFilters,
        lastTouchedFolder,
        rootFileSet,
        sortColumn,
        visibleModal,
    ]);
}
