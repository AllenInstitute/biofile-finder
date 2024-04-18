import { ActionButton, IButtonStyles, Icon } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import FileThumbnail from "../../components/FileThumbnail";
import WindowActionButton from "../../components/WindowActionButton";
import useFileDetails from "./useFileDetails";
import windowStateReducer, { INITIAL_STATE, WindowState } from "./windowStateReducer";
import Download from "./Download";
import FileAnnotationList from "./FileAnnotationList";
import OpenFileButton from "./OpenFileButton";
import Pagination from "./Pagination";
import { ROOT_ELEMENT_ID } from "../../App";
import { selection } from "../../state";
import SvgIcon from "../../components/SvgIcon";
import { NO_IMAGE_ICON_PATH_DATA } from "../../icons";
import { RENDERABLE_IMAGE_FORMATS, THUMBNAIL_SIZE_TO_NUM_COLUMNS } from "../../constants";

import styles from "./FileDetails.module.css";

interface FileDetails {
    className?: string;
}

const windowStateToClassnameMap: { [index: string]: string } = {
    [WindowState.DEFAULT]: styles.default,
    [WindowState.MINIMIZED]: styles.minimized,
    [WindowState.MAXIMIZED]: styles.maximized,
};

export const WINDOW_ACTION_BUTTON_WIDTH = 23; // arbitrary

const ICON_BUTTON_STYLES: IButtonStyles = {
    icon: {
        color: "black",
        fontSize: "12px",
    },
    label: {
        width: "100%",
    },
    root: {
        background: "none",
        height: 24,
        width: "100%",
        ":hover, :hover *": {
            backgroundColor: "#878787",
            color: "white",
        },
    },
    iconHovered: {
        backgroundColor: "#878787",
        color: "white",
    },
    splitButtonMenuButton: {
        border: "None",
        borderLeft: "black 1px solid",
        borderBottomRightRadius: "10px",
        borderTopRightRadius: "10px",
        paddingLeft: "2px",
        ":hover, :hover *": {
            backgroundColor: "#878787",
            color: "white",
            cursor: "pointer",
        },
    },
    splitButtonMenuIcon: {
        color: "black",
        fontSize: "10px",
    },
    textContainer: {
        width: "100%",
    },
};

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
export default function FileDetails(props: FileDetails) {
    const globalDispatch = useDispatch();
    const [windowState, windowDispatch] = React.useReducer(windowStateReducer, INITIAL_STATE);
    const [fileDetails, isLoading] = useFileDetails();
    const fileGridColumnCount = useSelector(selection.selectors.getFileGridColumnCount);
    const shouldDisplaySmallFont = useSelector(selection.selectors.getShouldDisplaySmallFont);
    const shouldDisplayThumbnailView = useSelector(
        selection.selectors.getShouldDisplayThumbnailView
    );

    // If FileDetails pane is minimized, set its width to the width of the WindowActionButtons. Else, let it be
    // defined by whatever the CSS determines (setting an inline style to undefined will prompt ReactDOM to not apply
    // it to the DOMElement altogether).
    const minimizedWidth =
        windowState.state === WindowState.MINIMIZED ? WINDOW_ACTION_BUTTON_WIDTH : undefined;

    // If the file has a thumbnail image specified, we want to display the specified thumbnail. Otherwise, we want
    // to display the file itself as the thumbnail if possible.
    // If there is no thumbnail and the file cannot be displayed as the thumbnail- show a no image icon
    let thumbnail = (
        <SvgIcon
            height={100}
            pathData={NO_IMAGE_ICON_PATH_DATA}
            viewBox="0,0,20,20"
            width={100}
            className={classNames(styles.fileThumbnailContainer, styles.noThumbnail, {
                [styles.thumbnailDefault]: windowState.state === WindowState.DEFAULT,
                [styles.thumbnailMaximized]: windowState.state === WindowState.MAXIMIZED,
            })}
        />
    ); // placeholder if no thumbnail exists
    if (fileDetails?.thumbnail) {
        // thumbnail exists
        thumbnail = (
            <div
                className={classNames(styles.fileThumbnailContainer, {
                    [styles.thumbnailDefault]: windowState.state === WindowState.DEFAULT,
                    [styles.thumbnailMaximized]: windowState.state === WindowState.MAXIMIZED,
                })}
            >
                <FileThumbnail
                    uri={`http://aics.corp.alleninstitute.org/labkey/fmsfiles/image${fileDetails.thumbnail}`}
                />
            </div>
        );
    } else if (fileDetails) {
        const isFileRenderableImage = RENDERABLE_IMAGE_FORMATS.some((format) =>
            fileDetails?.name.toLowerCase().endsWith(format)
        );
        if (isFileRenderableImage) {
            // render the image as the thumbnail
            thumbnail = (
                <div
                    className={classNames(styles.fileThumbnailContainer, {
                        [styles.thumbnailDefault]: windowState.state === WindowState.DEFAULT,
                        [styles.thumbnailMaximized]: windowState.state === WindowState.MAXIMIZED,
                    })}
                >
                    <FileThumbnail
                        uri={`http://aics.corp.alleninstitute.org/labkey/fmsfiles/image${fileDetails.path}`}
                    />
                </div>
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
                    <ActionButton
                        className={classNames(styles.fontSizeButton, {
                            [styles.disabled]:
                                shouldDisplayThumbnailView &&
                                fileGridColumnCount === THUMBNAIL_SIZE_TO_NUM_COLUMNS.LARGE,
                        })}
                        disabled={
                            shouldDisplayThumbnailView &&
                            fileGridColumnCount === THUMBNAIL_SIZE_TO_NUM_COLUMNS.LARGE
                        }
                        onClick={() => {
                            globalDispatch(selection.actions.setFileThumbnailView(true));
                            globalDispatch(
                                selection.actions.setFileGridColumnCount(
                                    THUMBNAIL_SIZE_TO_NUM_COLUMNS.LARGE
                                )
                            );
                        }}
                        title="Large thumbnail view"
                    >
                        <Icon iconName="GridViewMedium"></Icon>
                    </ActionButton>
                    <ActionButton
                        className={classNames(styles.fontSizeButton, {
                            [styles.disabled]:
                                shouldDisplayThumbnailView &&
                                fileGridColumnCount === THUMBNAIL_SIZE_TO_NUM_COLUMNS.SMALL,
                        })}
                        disabled={
                            shouldDisplayThumbnailView &&
                            fileGridColumnCount === THUMBNAIL_SIZE_TO_NUM_COLUMNS.SMALL
                        }
                        onClick={() => {
                            globalDispatch(selection.actions.setFileThumbnailView(true));
                            globalDispatch(
                                selection.actions.setFileGridColumnCount(
                                    THUMBNAIL_SIZE_TO_NUM_COLUMNS.SMALL
                                )
                            );
                        }}
                        title="Small thumbnail view"
                    >
                        <Icon iconName="GridViewSmall"></Icon>
                    </ActionButton>
                    <ActionButton
                        className={classNames(styles.fontSizeButton, {
                            [styles.disabled]: !shouldDisplayThumbnailView,
                        })}
                        disabled={!shouldDisplayThumbnailView}
                        onClick={() =>
                            globalDispatch(
                                selection.actions.setFileThumbnailView(!shouldDisplayThumbnailView)
                            )
                        }
                        title="List view"
                    >
                        <Icon iconName="BulletedList"></Icon>
                    </ActionButton>
                    <div className={styles.fontSizeButtonContainer}>
                        <ActionButton
                            className={classNames(styles.fontSizeButton, {
                                [styles.disabled]: shouldDisplaySmallFont,
                            })}
                            disabled={shouldDisplaySmallFont}
                            onClick={() =>
                                globalDispatch(
                                    selection.actions.adjustGlobalFontSize(!shouldDisplaySmallFont)
                                )
                            }
                            text="a"
                        />
                        <ActionButton
                            className={classNames(styles.fontSizeButton, {
                                [styles.disabled]: !shouldDisplaySmallFont,
                            })}
                            disabled={!shouldDisplaySmallFont}
                            onClick={() =>
                                globalDispatch(
                                    selection.actions.adjustGlobalFontSize(!shouldDisplaySmallFont)
                                )
                            }
                            text="A"
                        />
                    </div>
                    <div className={styles.contentContainer}>
                        <div
                            className={classNames(styles.overflowContainer, {
                                [styles.hidden]: windowState.state === WindowState.MINIMIZED,
                            })}
                        >
                            {fileDetails && thumbnail}
                            <div className={styles.fileActions}>
                                <Download
                                    buttonStyles={ICON_BUTTON_STYLES}
                                    fileDetails={fileDetails}
                                />
                                <OpenFileButton
                                    buttonStyles={ICON_BUTTON_STYLES}
                                    fileDetails={fileDetails}
                                />
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
