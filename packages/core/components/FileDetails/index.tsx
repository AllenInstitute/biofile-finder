import { ContextualMenuItemType, IContextualMenuItem, Icon } from "@fluentui/react";
import classNames from "classnames";
import { noop, throttle } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import FileAnnotationList from "./FileAnnotationList";
import Pagination from "./Pagination";
import useFileDetails from "./useFileDetails";
import PrimaryButton from "../Buttons/PrimaryButton";
import { ContextMenuActions } from "../ContextMenu/items";
import FileFilter from "../../entity/FileFilter";
import { ROOT_ELEMENT_ID } from "../../App";
import FileThumbnail from "../../components/FileThumbnail";
import { interaction } from "../../state";

import styles from "./FileDetails.module.css";

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
    const dispatch = useDispatch();
    const [fileDetails, isLoading] = useFileDetails();
    const isOnWeb = useSelector(interaction.selectors.isOnWeb);
    const processStatuses = useSelector(interaction.selectors.getProcessStatuses);
    const userSelectedApplications = useSelector(interaction.selectors.getUserSelectedApplications);
    const { executionEnvService } = useSelector(interaction.selectors.getPlatformDependentServices);

    // Prevent triggering multiple downloads accidentally -- throttle with a 1s wait
    const onDownload = React.useMemo(() => {
        if (!fileDetails) {
            return noop;
        }

        return throttle(() => {
            dispatch(
                interaction.actions.downloadFiles([
                    {
                        id: fileDetails.id,
                        name: fileDetails.name,
                        size: fileDetails.size,
                        path: fileDetails.downloadPath,
                    },
                ])
            );
        }, 1000); // 1s, in ms (arbitrary)
    }, [dispatch, fileDetails]);

    const openMenuItems: IContextualMenuItem[] = React.useMemo(() => {
        if (!fileDetails) {
            return [];
        }

        const savedApps: IContextualMenuItem[] = [
            ...(userSelectedApplications || []).map((app) => {
                const name = executionEnvService.getFilename(app.filePath);
                return {
                    key: `open-with-${name}`,
                    text: name,
                    title: `Open files with ${name}`,
                    onClick() {
                        dispatch(interaction.actions.openWith(app, undefined, [fileDetails]));
                    },
                };
            }),
            {
                key: ContextMenuActions.OPEN_3D_WEB_VIEWER,
                text: "3D Web Viewer",
                title: `Open files with 3D Web Viewer`,
                href: `https://allen-cell-animated.github.io/website-3d-cell-viewer/?url=${fileDetails.path}/`,
                target: "_blank",
            },
            {
                key: ContextMenuActions.AGAVE,
                text: "AGAVE",
                title: `Open files with AGAVE`,
                href: `agave://${fileDetails.path}`,
                target: "_blank",
            },
        ];

        return [
            ...savedApps.sort((a, b) => (a.text || "").localeCompare(b.text || "")),
            ...(isOnWeb
                ? []
                : [
                      {
                          key: "default-apps-border",
                          itemType: ContextualMenuItemType.Divider,
                      },
                      // Other is a permanent option that allows the user
                      // to add another app for file access
                      {
                          key: ContextMenuActions.OPEN_WITH_OTHER,
                          text: "Other...",
                          title: "Select an application to open the selection with",
                          onClick() {
                              dispatch(
                                  interaction.actions.promptForNewExecutable([
                                      new FileFilter("file_id", fileDetails.id),
                                  ])
                              );
                          },
                      },
                  ]),
        ];
    }, [dispatch, isOnWeb, fileDetails, userSelectedApplications, executionEnvService]);

    return (
        <div
            className={classNames(styles.root, styles.expandableTransition, props.className)}
            id={FILE_DETAILS_PANE_ID}
        >
            <div className={styles.fileDetailsContent}>
                <div
                    className={styles.resizeHandle}
                    onMouseDown={(e) => resizeHandleOnMouseDown(e)}
                    // TODO:???
                    onDoubleClick={resizeHandleDoubleClick}
                >
                    <Icon iconName="MoreVertical" />
                </div>
                <div className={styles.paginationAndContent}>
                    <Pagination className={styles.pagination} />
                    <div className={styles.contentContainer}>
                        <div className={styles.overflowContainer}>
                            {fileDetails && (
                                <>
                                    <div className={styles.thumbnailContainer}>
                                        <FileThumbnail
                                            className={styles.thumbnail}
                                            width="100%"
                                            // height={thumbnailHeight}
                                            uri={fileDetails?.getPathToThumbnail()}
                                        />
                                    </div>
                                    <div className={styles.fileActions}>
                                        <PrimaryButton
                                            className={styles.primaryButton}
                                            disabled={processStatuses.some((status) =>
                                                status.data.fileId?.includes(fileDetails.id)
                                            )}
                                            iconName="Download"
                                            text="Download"
                                            title="Download"
                                            onClick={onDownload}
                                        />
                                        <PrimaryButton
                                            className={styles.primaryButton}
                                            iconName="OpenInNewWindow"
                                            text="Open file"
                                            title="Open file"
                                            menuItems={openMenuItems}
                                        />
                                    </div>
                                    <p className={styles.fileName}>{fileDetails?.name}</p>
                                    <h4 className={styles.title}>Information</h4>
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
