import classNames from "classnames";
import * as React from "react";

import FileThumbnail from "../../components/FileThumbnail";
import WindowActionButton from "../../components/WindowActionButton";
import useFileDetails from "./useFileDetails";
import windowStateReducer, { INITIAL_STATE, WindowState } from "./windowStateReducer";
import Download from "./Download";
import FileAnnotationList from "./FileAnnotationList";
import OpenFileButton from "./OpenFileButton";
import Pagination from "./Pagination";
import { ROOT_ELEMENT_ID } from "../../App";

import styles from "./FileDetails.module.css";

interface Props {
    className?: string;
}

const windowStateToClassnameMap: { [index: string]: string } = {
    [WindowState.DEFAULT]: styles.default,
    [WindowState.MINIMIZED]: styles.minimized,
    [WindowState.MAXIMIZED]: styles.maximized,
};

export const WINDOW_ACTION_BUTTON_WIDTH = 23; // arbitrary

const FILE_DETAILS_PANE_ID = "file-details-pane";
const FILE_DETAILS_WIDTH_ATTRIBUTE = "--file-details-width";

function resizeHandleOnMouseDown(mouseDownEvent: React.MouseEvent<HTMLDivElement>) {
    const rootElement: HTMLElement | null = document.getElementById(ROOT_ELEMENT_ID);
    const fileDetailsPane: HTMLElement | null = document.getElementById(FILE_DETAILS_PANE_ID);
    // This _should_ always be true, but is otherwise not a huge deal
    if (rootElement && fileDetailsPane) {
        fileDetailsPane.classList.remove(styles.expandableTransition);

        const startingWidth = fileDetailsPane.offsetWidth;
        const startingPageX = mouseDownEvent.pageX;

        const resizeHandleRootOnMouseMove = (mouseMoveEvent: MouseEvent) => {
            mouseMoveEvent.preventDefault();
            const newWidth = startingWidth + (startingPageX - mouseMoveEvent.pageX);

            if (mouseMoveEvent.buttons === 1 && newWidth >= 175) {
                // If primary button (left-click) is still pressed and newWidth is still greater
                //   than the minimum width we want for the pane
                rootElement.style.setProperty(FILE_DETAILS_WIDTH_ATTRIBUTE, `${newWidth}px`);
            } else {
                // Remove this listener if user releases the primary button
                rootElement.removeEventListener("mousemove", resizeHandleRootOnMouseMove);
                fileDetailsPane.classList.add(styles.expandableTransition);
            }
        };

        rootElement.addEventListener("mousemove", resizeHandleRootOnMouseMove);
    } else {
        console.log(`"${ROOT_ELEMENT_ID}" element or "${FILE_DETAILS_PANE_ID}" element not found`);
    }
}

function resizeHandleDoubleClick() {
    const rootElement: HTMLElement | null = document.getElementById(ROOT_ELEMENT_ID);
    const fileDetailsPane: HTMLElement | null = document.getElementById(FILE_DETAILS_PANE_ID);

    if (rootElement && fileDetailsPane) {
        // Return details pane width to the default (20%)
        fileDetailsPane.classList.add(styles.expandableTransition);
        rootElement.style.setProperty(FILE_DETAILS_WIDTH_ATTRIBUTE, "20%");
    } else {
        console.log(`"${ROOT_ELEMENT_ID}" element or "${FILE_DETAILS_PANE_ID}" element not found`);
    }
}

/**
 * Right-hand sidebar of application. Displays details of selected file(s).
 */
export default function FileDetails(props: Props) {
    const [windowState, windowDispatch] = React.useReducer(windowStateReducer, INITIAL_STATE);
    const [fileDetails, isLoading] = useFileDetails();

    // If FileDetails pane is minimized, set its width to the width of the WindowActionButtons. Else, let it be
    // defined by whatever the CSS determines (setting an inline style to undefined will prompt ReactDOM to not apply
    // it to the DOMElement altogether).
    const minimizedWidth =
        windowState.state === WindowState.MINIMIZED ? WINDOW_ACTION_BUTTON_WIDTH : undefined;

    const thumbnailPath = fileDetails?.getPathToThumbnail();
    let thumbnailHeight = undefined;
    let thumbnailWidth = undefined;
    if (windowState.state === WindowState.DEFAULT) {
        thumbnailWidth = "100%";
    } else if (windowState.state === WindowState.MAXIMIZED) {
        thumbnailWidth = "40%";
        thumbnailHeight = "40%";
    }
    return (
        <div
            className={classNames(styles.root, props.className)}
            style={{
                flexBasis: minimizedWidth,
            }}
        >
            <div
                className={classNames(
                    styles.expandable,
                    styles.expandableTransition,
                    windowStateToClassnameMap[windowState.state]
                )}
                style={{ width: minimizedWidth }}
                id={FILE_DETAILS_PANE_ID}
            >
                {windowState.state === WindowState.DEFAULT && (
                    <div
                        className={styles.resizeHandle}
                        onMouseDown={(e) => resizeHandleOnMouseDown(e)}
                        onDoubleClick={resizeHandleDoubleClick}
                    />
                )}
                <div className={styles.fileDetailsContent}>
                    <div className={styles.windowButtonsContainer}>
                        <div className={styles.windowButtons}>
                            {windowState.possibleActions.map((action) => (
                                <WindowActionButton
                                    key={action}
                                    action={action}
                                    onClick={() => windowDispatch({ type: action })}
                                    width={WINDOW_ACTION_BUTTON_WIDTH}
                                />
                            ))}
                        </div>
                    </div>
                    <Pagination
                        className={classNames(styles.pagination, {
                            [styles.hidden]: windowState.state === WindowState.MINIMIZED,
                        })}
                    />
                    <div className={styles.contentContainer}>
                        <div
                            className={classNames(styles.overflowContainer, {
                                [styles.hidden]: windowState.state === WindowState.MINIMIZED,
                            })}
                        >
                            {fileDetails && (
                                <>
                                    <div className={styles.thumbnailContainer}>
                                        <FileThumbnail
                                            className={styles.thumbnail}
                                            width={thumbnailWidth}
                                            height={thumbnailHeight}
                                            uri={thumbnailPath}
                                        />
                                    </div>
                                    <div className={styles.fileActions}>
                                        <Download
                                            className={styles.iconButton}
                                            fileDetails={fileDetails}
                                        />
                                        <OpenFileButton
                                            className={styles.iconButton}
                                            fileDetails={fileDetails}
                                        />
                                    </div>
                                    <p className={styles.fileName}>{fileDetails?.name}</p>
                                    <hr className={styles.fileNameDivider} />
                                    <FileAnnotationList
                                        className={styles.annotationList}
                                        fileDetails={fileDetails}
                                        isLoading={isLoading}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
