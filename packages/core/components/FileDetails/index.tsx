import classNames from "classnames";
import * as React from "react";

import FileThumbnail from "../../components/FileThumbnail";
import WindowActionButton from "../../components/WindowActionButton";
import useFileDetails from "./useFileDetails";
import windowStateReducer, { INITIAL_STATE, WindowState } from "./windowStateReducer";
import Download from "./Download";
import FileAnnotationList from "./FileAnnotationList";
import Pagination from "./Pagination";
import { ROOT_ELEMENT_ID } from "../../App";

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

const FILE_DETAILS_PANE_ID = "file-details-pane";
const FILE_DETAILS_WIDTH_ATTRIBUTE = "--file-details-width";

/**
 * Right-hand sidebar of application. Displays details of selected file(s).
 */
export default function FileDetails(props: FileDetails) {
    const [windowState, dispatch] = React.useReducer(windowStateReducer, INITIAL_STATE);
    const [fileDetails, isLoading] = useFileDetails();

    // If FileDetails pane is minimized, set its width to the width of the WindowActionButtons. Else, let it be
    // defined by whatever the CSS determines (setting an inline style to undefined will prompt ReactDOM to not apply
    // it to the DOMElement altogether).
    const minimizedWidth =
        windowState.state === WindowState.MINIMIZED ? WINDOW_ACTION_BUTTON_WIDTH : undefined;

    // If the file has a thumbnail image specified, we want to display the specified thumbnail. Otherwise, we want
    // to display the file itself as the thumbnail if possible.
    let thumbnailUriPath = "";
    if (fileDetails?.thumbnail) {
        thumbnailUriPath = fileDetails.thumbnail;
    } else if (fileDetails) {
        const renderableImageFormats = [".jpg", ".jpeg", ".png", ".gif"];
        const isFileRenderableImage = renderableImageFormats.some((format) =>
            fileDetails?.name.toLowerCase().endsWith(format)
        );
        if (isFileRenderableImage) thumbnailUriPath = fileDetails.path;
    }

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
            console.log(
                `"${ROOT_ELEMENT_ID}" element or "${FILE_DETAILS_PANE_ID}" element not found`
            );
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
            console.log(
                `"${ROOT_ELEMENT_ID}" element or "${FILE_DETAILS_PANE_ID}" element not found`
            );
        }
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
                                    onClick={() => dispatch({ type: action })}
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
                            {thumbnailUriPath && (
                                <div
                                    className={classNames(styles.fileThumbnailContainer, {
                                        [styles.thumbnailDefault]:
                                            windowState.state === WindowState.DEFAULT,
                                        [styles.thumbnailMaximized]:
                                            windowState.state === WindowState.MAXIMIZED,
                                    })}
                                >
                                    <FileThumbnail
                                        uri={`http://aics.corp.alleninstitute.org/labkey/fmsfiles/image${thumbnailUriPath}`}
                                    />
                                </div>
                            )}
                            <div className={styles.fileActions}>
                                <Download fileDetails={fileDetails} />
                            </div>
                            <FileAnnotationList
                                className={styles.annotationList}
                                fileDetails={fileDetails}
                                isLoading={isLoading}
                            />
                            <div className={styles.spacer} />
                            <div className={styles.gradientTeaser} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
