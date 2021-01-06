import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction, selection } from "../../state";
import AggregateInfoBox from "../AggregateInfoBox";
import FilterDisplayBar from "../FilterDisplayBar";
import FileFolder from "../../entity/FileFolder";
import FileFilter from "../../entity/FileFilter";
import FileSelection from "../../entity/FileSelection";
import FileSet from "../../entity/FileSet";
import NumericRange from "../../entity/NumericRange";
import RootLoadingIndicator from "./RootLoadingIndicator";
import useDirectoryHierarchy from "./useDirectoryHierarchy";

const styles = require("./DirectoryTree.module.css");

enum KeyboardCode {
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
    const fileSelection = useSelector(selection.selectors.getFileSelection);
    const hierarchy = useSelector(selection.selectors.getAnnotationHierarchy);
    const openFileFolders = useSelector(selection.selectors.getOpenFileFolders);
    const fileSet = React.useMemo(() => {
        return new FileSet({
            fileService: fileService,
            filters: globalFilters,
        });
    }, [fileService, globalFilters]);

    // Add event listener for up & down arrow keys
    React.useEffect(() => {
        const openFileListPaths = openFileFolders.filter(
            (fileFolder) => fileFolder.size() === hierarchy.length
        );
        const sortedOpenFileListPaths = FileFolder.sort(openFileListPaths);

        // On a up arrow key or down arrow key press this event will update the file list selection & focused file
        // to be either the row above (if the up arrow was pressed) or the row below (if the down arrow was pressed)
        // this will effectively clear the current selection in favor of the newly navigated to row.
        // If at the beginning or end of a file list and attempting to navigate up or down the file selected & focused will
        // be in the file list above or below respectively if possible.
        const onArrowKeyDown = async (event: KeyboardEvent) => {
            if (event.code === KeyboardCode.ArrowUp || event.code === KeyboardCode.ArrowDown) {
                const currentFocusedItem = fileSelection.focusedItem;
                // No-op no files are currently focused so no jumping off point to navigate from
                if (!currentFocusedItem) {
                    return;
                }

                // Determine the file folder the current focused item is in as well as the relative
                // position of the file list compared to the other open file lists
                const fileFolderForCurrentFocusedItem = new FileFolder(
                    currentFocusedItem.fileSet.filters.map((filter) => filter.value)
                );
                const indexOfFocusedFileList = sortedOpenFileListPaths.findIndex((fileFolder) =>
                    fileFolder.equals(fileFolderForCurrentFocusedItem)
                );

                // If the event key pressed was the up arrow move to the file one row above the currently
                // focused one. If already at the top of the file list navigate to the bottom of the next open
                // file list above the current one. If already at the top file list and top file for that file list
                // no operation is performed.
                let nextFileSet;
                let indexWithinFileSet;
                if (event.code === KeyboardCode.ArrowUp) {
                    const previousIndexWithinFileSet = currentFocusedItem.indexWithinFileSet - 1;
                    if (previousIndexWithinFileSet >= 0) {
                        // If not at the top of the current file list navigate one row up
                        nextFileSet = currentFocusedItem.fileSet;
                        indexWithinFileSet = previousIndexWithinFileSet;
                    } else if (indexOfFocusedFileList > 0) {
                        // If not at the top file list (but at the top of this file list) navigate
                        // to the bottom of the next open file list above this one
                        const previousFileListIndex = indexOfFocusedFileList - 1;
                        nextFileSet = new FileSet({
                            fileService,
                            filters: sortedOpenFileListPaths[previousFileListIndex].fileFolder.map(
                                (filterValue, index) =>
                                    new FileFilter(hierarchy[index].displayName, filterValue)
                            ),
                        });
                        const totalFileSetSize = await nextFileSet.fetchTotalCount();
                        indexWithinFileSet = totalFileSetSize - 1;
                    } else {
                        // No-op no file list above to navigate to
                        return;
                    }
                } else {
                    // KeyboardCode.ArrowDown
                    const nextIndexWithinFileList = currentFocusedItem.indexWithinFileSet + 1;
                    const nextFileListIndex = indexOfFocusedFileList + 1;
                    const totalFileSetSize = await currentFocusedItem.fileSet.fetchTotalCount();
                    if (nextIndexWithinFileList < totalFileSetSize) {
                        // If not at the bottom of the current file list navigate one row down
                        nextFileSet = currentFocusedItem.fileSet;
                        indexWithinFileSet = nextIndexWithinFileList;
                    } else if (nextFileListIndex < sortedOpenFileListPaths.length) {
                        // If not at the bottom file list (but at the bottom of this file list) navigate
                        // to the top of the next open file list below this one
                        nextFileSet = new FileSet({
                            fileService,
                            filters: sortedOpenFileListPaths[nextFileListIndex].fileFolder.map(
                                (filterValue, index) =>
                                    new FileFilter(hierarchy[index].displayName, filterValue)
                            ),
                        });
                        indexWithinFileSet = 0;
                    } else {
                        // No-op no file list below to navigate to
                        return;
                    }
                }
                const newFocusedItem = {
                    fileSet: nextFileSet,
                    indexAcrossAllSelections: 0,
                    indexWithinFileSet,
                    selection: new NumericRange(indexWithinFileSet, indexWithinFileSet),
                    sortOrder: currentFocusedItem ? currentFocusedItem.sortOrder : 0,
                };
                const newFileSelection = new FileSelection([newFocusedItem], newFocusedItem);
                dispatch(selection.actions.setFileSelection(newFileSelection));
            }
        };

        window.addEventListener("keydown", onArrowKeyDown, true);
        return () => window.removeEventListener("keydown", onArrowKeyDown, true);
    }, [fileSelection, fileService, hierarchy, openFileFolders, dispatch]);

    const {
        state: { content, error, isLoading },
    } = useDirectoryHierarchy({ collapsed: false, fileSet, sortOrder: 0 });

    return (
        <div className={classNames(props.className, styles.container)}>
            <RootLoadingIndicator visible={isLoading} />
            <FilterDisplayBar className={styles.filterDisplayBar} classNameHidden={styles.hidden} />
            <ul className={styles.scrollContainer} role="tree" aria-multiselectable="true">
                {!error && content}
                {error && (
                    <aside className={styles.errorMessage}>
                        <p>Whoops! Something went wrong:</p>
                        <p>{error.message}</p>
                    </aside>
                )}
            </ul>
            <AggregateInfoBox />
        </div>
    );
}
