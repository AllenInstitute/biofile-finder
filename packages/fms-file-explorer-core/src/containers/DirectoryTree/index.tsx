import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction, selection } from "../../state";
import AggregateInfoBox from "../AggregateInfoBox";
import FilterDisplayBar from "../FilterDisplayBar";
import { FocusDirective } from "../../entity/FileSelection";
import FileSet from "../../entity/FileSet";
import RootLoadingIndicator from "./RootLoadingIndicator";
import useDirectoryHierarchy from "./useDirectoryHierarchy";

const styles = require("./DirectoryTree.module.css");

enum KeyboardCode {
    ArrowUp = "ArrowUp",
    ArrowDown = "ArrowDown",
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
    const fileSet = React.useMemo(() => {
        return new FileSet({
            fileService: fileService,
            filters: globalFilters,
        });
    }, [fileService, globalFilters]);

    // Add event listeners for up & down arrow keys
    React.useEffect(() => {
        const onArrowKeyDown = (event: KeyboardEvent) => {
            if (event.code === KeyboardCode.ArrowUp || event.code === KeyboardCode.ArrowDown) {
                let focusDirective;
                if (event.code === KeyboardCode.ArrowUp) {
                    focusDirective = FocusDirective.PREVIOUS;
                } else {
                    // KeyboardCode.ArrowDown
                    focusDirective = FocusDirective.NEXT;
                }
                dispatch(selection.actions.setFileSelection(fileSelection.focus(focusDirective)));
            }
        };
        window.addEventListener("keydown", onArrowKeyDown, true);
        return () => window.removeEventListener("keydown", onArrowKeyDown, true);
    }, [fileSelection, dispatch]);

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
