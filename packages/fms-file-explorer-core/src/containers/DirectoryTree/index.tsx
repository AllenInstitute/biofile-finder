import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction, selection } from "../../state";
import AggregateInfoBox from "../AggregateInfoBox";
import FilterDisplayBar from "../FilterDisplayBar";
import FileSelection from "../../entity/FileSelection";
import FileSet from "../../entity/FileSet";
import RootLoadingIndicator from "./RootLoadingIndicator";
import useDirectoryHierarchy from "./useDirectoryHierarchy";
import NumericRange from "../../entity/NumericRange";
import FileFolder from "../../entity/FileFolder";
import FileFilter from "../../entity/FileFilter";

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

    // Add event listeners for up & down arrow keys
    React.useEffect(() => {
        const onArrowKeyDown = async (event: KeyboardEvent) => {
            if (event.code === KeyboardCode.ArrowUp || event.code === KeyboardCode.ArrowDown) {
                const currentFocusedItem = fileSelection.focusedItem;
                // If no files are currently focused then we have no jumping off point to navigate to
                if (!currentFocusedItem) {
                    return;
                }
                const openFileListPaths = openFileFolders.filter(
                    (fileFolder) => fileFolder.size() === hierarchy.length
                );
                const sortedOpenFileListPaths = FileFolder.sort(openFileListPaths);
                const fileFolderForCurrentFocusedItem = new FileFolder(
                    currentFocusedItem.fileSet.filters.map((filter) => filter.value)
                );
                const indexOfFocusedFileList = sortedOpenFileListPaths.findIndex((fileFolder) =>
                    fileFolder.equals(fileFolderForCurrentFocusedItem)
                );
                let nextFileSet;
                let indexWithinFileSet;
                if (event.code === KeyboardCode.ArrowUp) {
                    if (currentFocusedItem.indexWithinFileSet !== 0) {
                        nextFileSet = currentFocusedItem.fileSet;
                        indexWithinFileSet = currentFocusedItem.indexWithinFileSet - 1;
                    } else if (indexOfFocusedFileList > 0) {
                        const previousFileListIndex = indexOfFocusedFileList - 1;
                        const filters = sortedOpenFileListPaths[
                            previousFileListIndex
                        ].fileFolder.map(
                            (filterValue, index) =>
                                new FileFilter(hierarchy[index].displayName, filterValue)
                        );
                        nextFileSet = new FileSet({
                            filters,
                            fileService,
                        });
                        const totalFileSetSize = await nextFileSet.fetchTotalCount();
                        indexWithinFileSet = totalFileSetSize - 1;
                    } else {
                        // No-op can't navigate anywhere else
                        return;
                    }
                } else {
                    // KeyboardCode.ArrowDown
                    const nextFileListIndex = indexOfFocusedFileList + 1;
                    const totalFileSetSize = await currentFocusedItem.fileSet.fetchTotalCount();
                    if (totalFileSetSize > currentFocusedItem.indexWithinFileSet + 1) {
                        nextFileSet = currentFocusedItem.fileSet;
                        indexWithinFileSet = currentFocusedItem.indexWithinFileSet + 1;
                    } else if (nextFileListIndex < sortedOpenFileListPaths.length) {
                        const filters = sortedOpenFileListPaths[nextFileListIndex].fileFolder.map(
                            (filterValue, index) =>
                                new FileFilter(hierarchy[index].displayName, filterValue)
                        );
                        nextFileSet = new FileSet({
                            filters,
                            fileService,
                        });
                        indexWithinFileSet = 0;
                    } else {
                        // No-op can't navigate anywhere else
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
