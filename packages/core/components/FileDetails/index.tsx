import { DefaultButton } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import MetadataList from "./MetadataList";
import Pagination from "./Pagination";
import useThumbnailPath from "./useThumbnailPath";
import { PrimaryButton, TertiaryButton, TransparentIconButton } from "../Buttons";
import Tooltip from "../Tooltip";
import { ROOT_ELEMENT_ID } from "../../App";
import FileThumbnail from "../../components/FileThumbnail";
import FileDetail from "../../entity/FileDetail";
import useDownloadFiles from "../../hooks/useDownloadFiles";
import useOpenWithMenuItems from "../../hooks/useOpenWithMenuItems";
import useTruncatedString from "../../hooks/useTruncatedString";
import { interaction, selection } from "../../state";

import styles from "./FileDetails.module.css";


interface Props {
    className?: string;
    file: FileDetail | undefined;
    isLoading?: boolean;
    onClose?: () => void;
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
 * Displays details of selected file(s).
 */
export default function FileDetails(props: Props) {
    const dispatch = useDispatch();
    const hasProvenanceSource = useSelector(selection.selectors.hasProvenanceSource);

    const openWithMenuItems = useOpenWithMenuItems(props.file);
    const truncatedFileName = useTruncatedString(props.file?.name || "", 30);
    const { isThumbnailLoading, thumbnailPath } = useThumbnailPath(props.file);
    const { isDownloadDisabled, disabledDownloadReason, onDownload } = useDownloadFiles(
        props.file
    );

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
            {/* TODO: Overflow gradient is broken */}
            <div className={styles.overflowContainer}>
                {props.file && (
                    <>
                        {!props.onClose ? (
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
                        ) : (
                            // TODO: What to do this button?
                            <div className={styles.buttonRow}>
                                <TransparentIconButton
                                    className={styles.clearButton}
                                    iconName="Clear"
                                    onClick={props.onClose}
                                />
                            </div>
                        )}
                        <p
                            className={classNames(styles.fileName, {
                                [styles.leftAlign]: !!props.onClose,
                            })}
                        >
                            {props.file?.name}
                        </p>
                        <div className={styles.thumbnailContainer}>
                            <FileThumbnail
                                className={styles.thumbnail}
                                width="100%"
                                uri={thumbnailPath}
                                loading={isThumbnailLoading}
                            />
                        </div>
                        {/* TODO: What to do this view provenance button? */}
                        {!props.onClose && (
                            <div className={styles.buttonRow}>
                                {hasProvenanceSource && (
                                    <DefaultButton
                                        onClick={() =>
                                            dispatch(
                                                interaction.actions.setOriginForProvenance(
                                                    props.file
                                                )
                                            )
                                        }
                                    >
                                        View provenance
                                    </DefaultButton>
                                )}
                            </div>
                        )}
                        <MetadataList
                            file={props.file}
                            isLoading={!!props.isLoading}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
