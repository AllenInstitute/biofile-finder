import { IStackTokens, Stack, StackItem } from "@fluentui/react";
import classNames from "classnames";
import { noop, throttle } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import FileAnnotationList from "./FileAnnotationList";
import Pagination from "./Pagination";
import useFileDetails from "./useFileDetails";
import { PrimaryButton } from "../Buttons";
import useOpenWithMenuItems from "../../hooks/useOpenWithMenuItems";
import { ROOT_ELEMENT_ID } from "../../App";
import FileThumbnail from "../../components/FileThumbnail";
import { interaction } from "../../state";

import styles from "./FileDetails.module.css";
import { MAX_DOWNLOAD_SIZE_WEB } from "../../services/FileDownloadService";

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
    const [thumbnailPath, setThumbnailPath] = React.useState<string | undefined>();
    const [isThumbnailLoading, setIsThumbnailLoading] = React.useState(true);
    const stackTokens: IStackTokens = { childrenGap: 12 + " " + 20 };
    const [calculatedSize, setCalculatedSize] = React.useState<number | null>(null);

    const platformDependentServices = useSelector(
        interaction.selectors.getPlatformDependentServices
    );
    const fileDownloadService = platformDependentServices.fileDownloadService;
    const isOnWeb = useSelector(interaction.selectors.isOnWeb);
    const isZarr = fileDetails?.path.endsWith(".zarr") || fileDetails?.path.endsWith(".zarr/");

    React.useEffect(() => {
        setCalculatedSize(null);
        if (fileDetails) {
            setIsThumbnailLoading(true);
            fileDetails.getPathToThumbnail().then((path) => {
                setThumbnailPath(path);
                setIsThumbnailLoading(false);
            });

            // Determine size of Zarr on web.
            if (isOnWeb && isZarr) {
                if (fileDetails.size && fileDetails.size > 0) {
                    setCalculatedSize(fileDetails.size);
                } else {
                    const { hostname, key } = fileDownloadService.parseS3Url(fileDetails.path);
                    fileDownloadService
                        .calculateS3DirectorySize(hostname, key)
                        .then(setCalculatedSize);
                }
            }
        }
    }, [fileDetails, fileDownloadService, isOnWeb, isZarr]);

    const processStatuses = useSelector(interaction.selectors.getProcessStatuses);
    const openWithMenuItems = useOpenWithMenuItems(fileDetails || undefined);

    // Disable download of large Zarrs ( > 2GB).
    const isDownloadDisabled = fileDetails
        ? processStatuses.some((status) => status.data.fileId?.includes(fileDetails.uid)) ||
          (isOnWeb &&
              isZarr &&
              // The Zarr size is calculated using the same traversal method as downloads
              // meaning that if the size cannot be determined, the download is also not possible.
              (calculatedSize === null || calculatedSize > MAX_DOWNLOAD_SIZE_WEB))
        : true;

    // Prevent triggering multiple downloads accidentally -- throttle with a 1s wait
    const onDownload = React.useMemo(() => {
        if (!fileDetails) {
            return noop;
        }

        return throttle(() => {
            dispatch(
                interaction.actions.downloadFiles([
                    {
                        id: fileDetails.uid,
                        name: fileDetails.name,
                        size: fileDetails.size,
                        path: fileDownloadService.isFileSystemAccessible
                            ? fileDetails.localPath || fileDetails.path
                            : fileDetails.path,
                    },
                ])
            );
        }, 1000); // 1s, in ms (arbitrary)
    }, [dispatch, fileDetails, fileDownloadService.isFileSystemAccessible]);

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
                <Pagination className={styles.pagination} />
                <div className={styles.overflowContainer}>
                    {fileDetails && (
                        <>
                            <div className={styles.thumbnailContainer}>
                                <FileThumbnail
                                    className={styles.thumbnail}
                                    width="100%"
                                    uri={thumbnailPath}
                                    loading={isThumbnailLoading}
                                />
                            </div>
                            <Stack
                                wrap
                                horizontal
                                horizontalAlign="center"
                                styles={{ root: styles.stack }}
                                tokens={stackTokens}
                            >
                                <StackItem>
                                    <PrimaryButton
                                        className={styles.primaryButton}
                                        disabled={isDownloadDisabled}
                                        iconName="Download"
                                        text="Download"
                                        title="Download file to local system"
                                        onClick={onDownload}
                                    />
                                </StackItem>
                                <StackItem>
                                    <PrimaryButton
                                        className={styles.primaryButton}
                                        iconName="OpenInNewWindow"
                                        text="Open file"
                                        title="Open file by selected method"
                                        menuItems={openWithMenuItems}
                                    />
                                </StackItem>
                            </Stack>
                            <p className={styles.fileName}>{fileDetails?.name}</p>
                            <h4>Information</h4>
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
