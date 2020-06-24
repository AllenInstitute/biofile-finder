import * as classNames from "classnames";
import * as React from "react";
import { useSelector } from "react-redux";

import FileThumbnail from "../../components/FileThumbnail";
import WindowActionButton from "../../components/WindowActionButton";
import { defaultFileSetFactory } from "../../entity/FileSet/FileSetFactory";
import useFileDetails from "./useFileDetails";
import windowStateReducer, { INITIAL_STATE, WindowState } from "./windowStateReducer";
import { interaction, metadata, selection } from "../../state";
import FileAnnotationList from "./FileAnnotationList";

const styles = require("./FileDetails.module.css");

interface FileDetails {
    className?: string;
}

const windowStateToClassnameMap: { [index: string]: string } = {
    [WindowState.DEFAULT]: styles.default,
    [WindowState.MINIMIZED]: styles.minimized,
    [WindowState.MAXIMIZED]: styles.maximized,
};

export const WINDOW_ACTION_BUTTON_WIDTH = 23; // arbitrary

/**
 * Right-hand sidebar of application. Displays details of selected file(s).
 */
export default function FileDetails(props: FileDetails) {
    const [windowState, dispatch] = React.useReducer(windowStateReducer, INITIAL_STATE);

    const annotations = useSelector(metadata.selectors.getAnnotations);
    const fileService = useSelector(interaction.selectors.getFileService);
    const selectedFileIndicesByFileSet = useSelector(
        selection.selectors.getSelectedFileIndicesByFileSet
    );
    const fileSets = Object.keys(selectedFileIndicesByFileSet);
    let fileSet;
    let fileIndexToDisplay;
    // If there is a file set with an index we can display select it,
    // In the event multiple file indices are available for display we want to just
    // display the first one we find.
    if (fileSets.length) {
        const fileSetHash = fileSets[0];
        fileSet = defaultFileSetFactory.get(fileSetHash);
        fileIndexToDisplay = selectedFileIndicesByFileSet[fileSetHash][0];
    }
    const [fileDetails, isLoading] = useFileDetails(fileIndexToDisplay, fileSet);

    // If FileDetails pane is minimized, set its width to the width of the WindowActionButtons. Else, let it be
    // defined by whatever the CSS determines (setting an inline style to undefined will prompt ReactDOM to not apply
    // it to the DOMElement altogether).
    const minimizedWidth =
        windowState.state === WindowState.MINIMIZED ? WINDOW_ACTION_BUTTON_WIDTH : undefined;

    return (
        <div
            className={classNames(styles.root, props.className)}
            style={{ flexBasis: minimizedWidth }}
        >
            <div
                className={classNames(
                    styles.expandable,
                    windowStateToClassnameMap[windowState.state]
                )}
                style={{ width: minimizedWidth }}
            >
                <div className={styles.windowButtons}>
                    {windowState.possibleActions.map((action) => (
                        <WindowActionButton
                            key={action}
                            action={action}
                            onClick={() => dispatch({ type: action })}
                            width={WINDOW_ACTION_BUTTON_WIDTH}
                        />
                    ))}
                </div>
                <div
                    className={classNames({
                        [styles.hidden]: windowState.state === WindowState.MINIMIZED,
                    })}
                >
                    {fileDetails && fileDetails.thumbnail && (
                        <div
                            className={classNames(styles.fileThumbnailContainer, {
                                [styles.thumbnailDefault]:
                                    windowState.state === WindowState.DEFAULT,
                                [styles.thumbnailMaximized]:
                                    windowState.state === WindowState.MAXIMIZED,
                            })}
                        >
                            <FileThumbnail
                                uri={`${fileService.baseUrl}/labkey/fmsfiles/image${fileDetails.thumbnail}`}
                            />
                        </div>
                    )}
                    <FileAnnotationList
                        allAnnotations={annotations}
                        fileDetails={fileDetails}
                        isLoading={isLoading}
                    />
                </div>
            </div>
        </div>
    );
}
