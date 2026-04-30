import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import RootLoadingIndicator from "./RootLoadingIndicator";
import useDirectoryHierarchy from "./useDirectoryHierarchy";
import AggregateInfoBox from "../AggregateInfoBox";
import EmptyFileListMessage from "../EmptyFileListMessage";
import FileFolder from "../../entity/FileFolder";
import { FilterType } from "../../entity/FileFilter";
import FileSet from "../../entity/FileSet";
import NumericRange from "../../entity/NumericRange";
import Tutorial from "../../entity/Tutorial";
import { interaction, selection } from "../../state";

import styles from "./DirectoryTree.module.css";

enum KeyboardCode {
    A = "a",
    ArrowDown = "ArrowDown",
    ArrowUp = "ArrowUp",
}

interface FileListProps {
    className?: string;
}

/**
 * Central UI dedicated to showing lists of available files in FMS. Can be a flat list in the case that no annotation
 * hierarchies have been applied, or nested in the case that the user has declared how (i.e., by which annotations) the
 * files should be grouped. E.g.:
 *
 * [collapsible folder] ScientistA
 *      [collapsible folder] plate123
 *      [collapsible folder] plate456
 *      [collapsible folder] plate789
 * [collapsible folder] ScientistB
 *      [collapsible folder] plate123
 *      [collapsible folder] plate456
 *      [collapsible folder] plate789
 */
export default function DirectoryTree(props: FileListProps) {
    const dispatch = useDispatch();
    const fileService = useSelector(interaction.selectors.getFileService);
    const globalFilters = useSelector(selection.selectors.getFileFilters);
    const sortColumn = useSelector(selection.selectors.getSortColumn);
    const visibleModal = useSelector(interaction.selectors.getVisibleModal);
    const fileSelection = useSelector(selection.selectors.getFileSelection);
    const openFileFolders = useSelector(selection.selectors.getOpenFileFolders);
    const annotationHierarchy = useSelector(selection.selectors.getAnnotationHierarchy);
    // If user is loading a new data source, show root loading state in file list
    // since it may take time for the view to update with new query results
    const isLoadingNewQueryOrSource = useSelector(selection.selectors.getLoadingQueryOrSource);
    const fileSet = React.useMemo(() => {
        return new FileSet({
            fileService: fileService,
            filters: globalFilters,
            sort: sortColumn,
        });
    }, [fileService, globalFilters, sortColumn]);

    // On a up arrow key or down arrow key press this event will update the file list selection & focused file
    // to be either the row above (if the up arrow was pressed) or the row below (if the down arrow was pressed)
    // this will effectively clear the current selection in favor of the newly navigated to row.
    // If at the beginning or end of a file list and attempting to navigate up or down the file selected & focused will
    // be in the file list above or below respectively if possible.
    // Should not register key presses when an overlay modal is active
    React.useEffect(() => {
        const onArrowKeyDown = (event: KeyboardEvent) => {
            if (!!visibleModal) return;
            else if (event.code === KeyboardCode.ArrowUp) {
                event.preventDefault(); // Prevent list from scrolling
                dispatch(selection.actions.selectNearbyFile("up", event.shiftKey));
            } else if (event.code === KeyboardCode.ArrowDown) {
                event.preventDefault(); // Prevent list from scrolling
                dispatch(selection.actions.selectNearbyFile("down", event.shiftKey));
            }
        };

        window.addEventListener("keydown", onArrowKeyDown, true);
        return () => window.removeEventListener("keydown", onArrowKeyDown, true);
    }, [dispatch, visibleModal]);

    // On Ctrl+A (or Cmd+A on Mac) select all files in the current file set.
    // Uses the file set the user last touched if its folder is still open;
    // otherwise falls back to the root file set.
    // Should not register key presses when an overlay modal is active.
    React.useEffect(() => {
        const onSelectAllKeyDown = async (event: KeyboardEvent) => {
            if (!!visibleModal) return;
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === KeyboardCode.A) {
                event.preventDefault();

                // Determine which file set to target: prefer the last-touched file set
                // if its corresponding folder is still open in the directory tree.
                let targetFileSet = fileSet;
                let targetSortOrder = 0;

                const focusedFileSet = fileSelection.focusedItem?.fileSet;
                if (focusedFileSet) {
                    if (annotationHierarchy.length === 0) {
                        // Flat list: no folders, always use the focused file set
                        targetFileSet = focusedFileSet;
                        targetSortOrder = fileSelection.focusedItem!.sortOrder;
                    } else {
                        // Hierarchy: the focused folder is considered "open" if its
                        // FileFolder path (the ordered annotation values from the focused
                        // file set's DEFAULT filters) exists in openFileFolders.
                        const folderPath = annotationHierarchy.map((name) =>
                            focusedFileSet.filters.find(
                                (f) => f.name === name && f.type === FilterType.DEFAULT
                            )?.value
                        );
                        if (folderPath.every((v) => v !== undefined)) {
                            const lastTouchedFolder = new FileFolder(folderPath);
                            if (openFileFolders.some((f) => f.equals(lastTouchedFolder))) {
                                targetFileSet = focusedFileSet;
                                targetSortOrder = fileSelection.focusedItem!.sortOrder;
                            }
                        }
                    }
                }

                const totalCount = await targetFileSet.fetchTotalCount();
                if (totalCount > 0) {
                    dispatch(
                        selection.actions.selectFile({
                            fileSet: targetFileSet,
                            selection: new NumericRange(0, totalCount - 1),
                            sortOrder: targetSortOrder,
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
        fileSelection,
        fileSet,
        openFileFolders,
        visibleModal,
    ]);

    const {
        state: { content, error, isLoading },
    } = useDirectoryHierarchy({ collapsed: false, fileSet, sortOrder: 0 });

    return (
        <div className={classNames(props.className, styles.container)}>
            <RootLoadingIndicator visible={isLoading || isLoadingNewQueryOrSource} />
            <div className={styles.verticalGradient} />
            <ul
                className={styles.scrollContainer}
                role="tree"
                aria-multiselectable="true"
                id={Tutorial.FILE_LIST_ID}
            >
                {!error && Array.isArray(content) && !content.length && <EmptyFileListMessage />}
                {!error && content}
                {error && !(isLoading || isLoadingNewQueryOrSource) && (
                    <aside className={styles.errorMessage}>
                        <h2>Whoops! Something went wrong:</h2>
                        <h2>{error.message ?? error}</h2>
                    </aside>
                )}
            </ul>
            <AggregateInfoBox />
        </div>
    );
}
