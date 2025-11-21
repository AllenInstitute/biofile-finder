import { DefaultButton } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch } from "react-redux";

import FileAnnotationList from "./FileAnnotationList";
import Pagination from "./Pagination";
import useFileDetails from "./useFileDetails";
import { PrimaryButton, TertiaryButton } from "../Buttons";
import Tooltip from "../Tooltip";
import { ROOT_ELEMENT_ID } from "../../App";
import FileThumbnail from "../../components/FileThumbnail";
import useOpenWithMenuItems from "../../hooks/useOpenWithMenuItems";
import useTruncatedString from "../../hooks/useTruncatedString";
import { interaction } from "../../state";

import styles from "./FileDetails.module.css";
import useDownloadFiles from "../../hooks/useDownloadFiles";
import useThumbnailPath from "./useThumbnailPath";

interface Props {
    className?: string;
}

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
                // than the minimum width we want for the pane
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
    const dispatch = useDispatch();

    const [fileDetails, isLoading] = useFileDetails();
    const openWithMenuItems = useOpenWithMenuItems(fileDetails || undefined);
    const truncatedFileName = useTruncatedString(fileDetails?.name || "", 30);
    const { isThumbnailLoading, thumbnailPath } = useThumbnailPath(fileDetails || undefined);
    const { isDownloadDisabled, disabledDownloadReason, onDownload } = useDownloadFiles(fileDetails || undefined);


    return (
        <div
            className={classNames(styles.root, styles.expandableTransition, props.className)}
            id={FILE_DETAILS_PANE_ID}
        >
            <div
                className={styles.resizeHandle}
                onMouseDown={(e) => resizeHandleOnMouseDown(e)}
                onDoubleClick={resizeHandleDoubleClick}
            >
                <div />
            </div>
            <div className={styles.paginationAndContent}>
                <div className={styles.overflowContainer}>
                    {fileDetails && (
                        <>
                            <div className={styles.header}>
                                <div className={styles.leftAlign}>
                                    <Pagination className={styles.pagination} />
                                </div>
                                {/* spacing component */}
                                <div className={styles.gutter}></div>
                                <div className={styles.rightAlign}>
                                    <Tooltip content={disabledDownloadReason}>
                                        <TertiaryButton
                                            className={styles.tertiaryButton}
                                            disabled={isDownloadDisabled}
                                            iconName="Download"
                                            id="download-file-button"
                                            title={`Download file ${truncatedFileName} to local system`}
                                            onClick={onDownload}
                                        />
                                    </Tooltip>
                                    <PrimaryButton
                                        className={styles.openWithButton}
                                        iconName="ChevronDownMed"
                                        text="Open with"
                                        title="Open file by selected method"
                                        menuItems={openWithMenuItems}
                                    />
                                </div>
                            </div>
                            <p className={styles.fileName}>{fileDetails?.name}</p>
                            <div className={styles.thumbnailContainer}>
                                <FileThumbnail
                                    className={styles.thumbnail}
                                    width="100%"
                                    uri={thumbnailPath}
                                    loading={isThumbnailLoading}
                                />
                            </div>
                            <div className={styles.titleRow}>
                                <h4>Metadata</h4>
                                <DefaultButton
                                    onClick={() => dispatch(interaction.actions.setOriginForProvenance(fileDetails))}
                                >
                                    View provenance
                                </DefaultButton>
                            </div>
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
    );
}
