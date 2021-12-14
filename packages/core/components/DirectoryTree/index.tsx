import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction, selection } from "../../state";
import AggregateInfoBox from "../AggregateInfoBox";
import FilterDisplayBar from "../FilterDisplayBar";
import FileSet from "../../entity/FileSet";
import RootLoadingIndicator from "./RootLoadingIndicator";
import useDirectoryHierarchy from "./useDirectoryHierarchy";
import FileMetadataSearchBar from "../FileMetadataSearchBar";

import styles from "./DirectoryTree.module.css";

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
    const sortColumn = useSelector(selection.selectors.getSortColumn);
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
    React.useEffect(() => {
        const onArrowKeyDown = (event: KeyboardEvent) => {
            if (event.code === KeyboardCode.ArrowUp) {
                event.preventDefault(); // Prevent list from scrolling
                dispatch(selection.actions.selectNearbyFile("up", event.shiftKey));
            } else if (event.code === KeyboardCode.ArrowDown) {
                event.preventDefault(); // Prevent list from scrolling
                dispatch(selection.actions.selectNearbyFile("down", event.shiftKey));
            }
        };

        window.addEventListener("keydown", onArrowKeyDown, true);
        return () => window.removeEventListener("keydown", onArrowKeyDown, true);
    }, [dispatch]);

    const {
        state: { content, error, isLoading },
    } = useDirectoryHierarchy({ collapsed: false, fileSet, sortOrder: 0 });

    return (
        <div className={classNames(props.className, styles.container)}>
            <RootLoadingIndicator visible={isLoading} />
            <FilterDisplayBar className={styles.filterDisplayBar} classNameHidden={styles.hidden} />
            <FileMetadataSearchBar />
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
