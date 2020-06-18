import * as classNames from "classnames";
import * as React from "react";
import { useSelector } from "react-redux";

import Cell from "../../components/FileRow/Cell";
import FileThumbnail from "../../components/FileThumbnail";
import WindowActionButton from "../../components/WindowActionButton";
import useFileDetails from "./useFileDetails";
import windowStateReducer, { INITIAL_STATE, WindowState } from "./windowStateReducer";
import selection from "../../state/selection";
import interaction from "../../state/interaction";

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
 *
 * GM 5/28/2020: This component is not currently in use--it was used in an early stage of the application prototype.
 * FMS-1225 is a placeholder ticket for picking this work effort back up.
 */
export default function FileDetails(props: FileDetails) {
    const [windowState, dispatch] = React.useReducer(windowStateReducer, INITIAL_STATE);

    const fileService = useSelector(interaction.selectors.getFileService);
    const selectedFileIndicesByFileSet = useSelector(
        selection.selectors.getSelectedFileIndicesByFileSet
    );
    let fileIndexToDisplay;
    let fileSetHash;
    if (selectedFileIndicesByFileSet) {
        const fileSets = Object.keys(selectedFileIndicesByFileSet);
        const fileSetsForCurrentDataSource = fileSets.filter(
            (fileSet) =>
                fileSet
                    .split(":")
                    .slice(1)
                    .join(":") === fileService.baseUrl
        );
        const usableFileSets = fileSetsForCurrentDataSource.filter(
            (fileSet) => selectedFileIndicesByFileSet[fileSet].length
        );
        if (usableFileSets.length) {
            fileSetHash = usableFileSets[0];
            fileIndexToDisplay = selectedFileIndicesByFileSet[fileSetHash][0];
        }
    }
    const [fileDetails, isLoading] = useFileDetails(fileIndexToDisplay, fileSetHash, fileService);

    // If FileDetails pane is minimized, set its width to the width of the WindowActionButtons. Else, let it be
    // defined by whatever the CSS determines (setting an inline style to undefined will prompt ReactDOM to not apply
    // it to the DOMElement altogether).
    const minimizedWidth =
        windowState.state === WindowState.MINIMIZED ? WINDOW_ACTION_BUTTON_WIDTH : undefined;
    let annotationRows;
    if (fileDetails) {
        annotationRows = [];
        annotationRows.push(
            <div key="file-name">
                <Cell columnKey="annotation-name" width={0.5}>
                    File Name
                </Cell>
                <Cell columnKey="annotation-values" width={0.5}>
                    {fileDetails.name}
                </Cell>
            </div>
        );
        annotationRows.push(
            <div key="file-id">
                <Cell columnKey="annotation-name" width={0.5}>
                    File ID
                </Cell>
                <Cell columnKey="annotation-values" width={0.5}>
                    {fileDetails.id}
                </Cell>
            </div>
        );
        annotationRows.push(
            <div key="file-type">
                <Cell columnKey="annotation-name" width={0.5}>
                    File Type
                </Cell>
                <Cell columnKey="annotation-values" width={0.5}>
                    {fileDetails.type}
                </Cell>
            </div>
        );
        annotationRows.push(
            <div key="file-path">
                <Cell columnKey="annotation-name" width={0.5}>
                    File Path
                </Cell>
                <Cell columnKey="annotation-values" width={0.5}>
                    {fileDetails.path}
                </Cell>
            </div>
        );
        if (fileDetails.thumbnail) {
            annotationRows.push(
                <div key="thumbnail-path">
                    <Cell columnKey="annotation-name" width={0.5}>
                        Thumbnail Path
                    </Cell>
                    <Cell columnKey="annotation-values" width={0.5}>
                        {fileDetails.thumbnail}
                    </Cell>
                </div>
            );
        }
        fileDetails.annotations.forEach((a) =>
            annotationRows.push(
                <div key={`${a.name}`}>
                    <Cell columnKey="annotation-name" width={0.5}>
                        {a.name}
                    </Cell>
                    <Cell columnKey="annotation-values" width={0.5}>
                        {a.values.map((v) => `${v}`).join(", ")}
                    </Cell>
                </div>
            )
        );
        if (fileDetails.positions && fileDetails.positions.length) {
            annotationRows.push(
                <div key="positions">
                    <Cell columnKey="annotation-name" width={0.5}>
                        Position
                    </Cell>
                    <Cell columnKey="annotation-values" width={0.5}>
                        {fileDetails.positions.map((v) => `${v.id}`).join(", ")}
                    </Cell>
                </div>
            );
        }
        if (fileDetails.channels && fileDetails.channels.length) {
            annotationRows.push(
                <div key="channels">
                    <Cell columnKey="annotation-name" width={0.5}>
                        Channel
                    </Cell>
                    <Cell columnKey="annotation-values" width={0.5}>
                        {fileDetails.channels.map((v) => `${v.id}`).join(", ")}
                    </Cell>
                </div>
            );
        }
        if (fileDetails.times && fileDetails.times.length) {
            annotationRows.push(
                <div key="time">
                    <Cell columnKey="annotation-name" width={0.5}>
                        Time
                    </Cell>
                    <Cell columnKey="annotation-values" width={0.5}>
                        {fileDetails.times.map((v) => `${v.id}`).join(", ")}
                    </Cell>
                </div>
            );
        }
    }

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
                    {isLoading ? (
                        "Loading..."
                    ) : (
                        <div>
                            <div className={styles.headerWrapper}>
                                <div className={styles.header}>
                                    <Cell columnKey="annotation-name" width={0.5}>
                                        Annotation
                                    </Cell>
                                    <Cell columnKey="annotation-values" width={0.5}>
                                        Values
                                    </Cell>
                                </div>
                            </div>
                            <div className={styles.listParent}>{annotationRows}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
