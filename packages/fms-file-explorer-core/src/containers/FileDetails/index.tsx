import classNames from "classnames";
import * as React from "react";

import FileThumbnail from "../../components/FileThumbnail";
import WindowActionButton from "../../components/WindowActionButton";
import useFileDetails from "./useFileDetails";
import windowStateReducer, { INITIAL_STATE, WindowState } from "./windowStateReducer";
import FileAnnotationList from "./FileAnnotationList";
import Pagination from "./Pagination";

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
    const [fileDetails, isLoading] = useFileDetails();

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
                                    uri={`http://aics.corp.alleninstitute.org/labkey/fmsfiles/image${fileDetails.thumbnail}`}
                                />
                            </div>
                        )}
                        <FileAnnotationList fileDetails={fileDetails} isLoading={isLoading} />
                        <div className={styles.spacer} />
                        <div className={styles.gradientTeaser} />
                    </div>
                </div>
            </div>
        </div>
    );
}
