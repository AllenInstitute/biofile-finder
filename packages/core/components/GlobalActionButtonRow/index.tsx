import { ActionButton, IconButton } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { THUMBNAIL_SIZE_TO_NUM_COLUMNS } from "../../constants";
import { selection } from "../../state";

import styles from "./GlobalActionButtonRow.module.css";

interface Props {
    className?: string;
}

/**
 * Top row of action buttons that are global to the app.
 */
export default function GlobalActionButtonRow(props: Props) {
    const dispatch = useDispatch();
    const fileGridColumnCount = useSelector(selection.selectors.getFileGridColumnCount);
    const shouldDisplaySmallFont = useSelector(selection.selectors.getShouldDisplaySmallFont);
    const shouldDisplayThumbnailView = useSelector(
        selection.selectors.getShouldDisplayThumbnailView
    );

    return (
        <div className={classNames(styles.container, props.className)}>
            <div className={styles.buttonGroup}>
                <IconButton
                    className={classNames(styles.iconButton, {
                        [styles.disabled]: !shouldDisplayThumbnailView,
                    })}
                    disabled={!shouldDisplayThumbnailView}
                    onClick={() =>
                        dispatch(
                            selection.actions.setFileThumbnailView(!shouldDisplayThumbnailView)
                        )
                    }
                    title="List view"
                    iconProps={{ iconName: "NumberedListText" }}
                />
                <IconButton
                    className={classNames(styles.iconButton, {
                        [styles.disabled]:
                            shouldDisplayThumbnailView &&
                            fileGridColumnCount === THUMBNAIL_SIZE_TO_NUM_COLUMNS.LARGE,
                    })}
                    disabled={
                        shouldDisplayThumbnailView &&
                        fileGridColumnCount === THUMBNAIL_SIZE_TO_NUM_COLUMNS.LARGE
                    }
                    onClick={() => {
                        dispatch(selection.actions.setFileThumbnailView(true));
                        dispatch(
                            selection.actions.setFileGridColumnCount(
                                THUMBNAIL_SIZE_TO_NUM_COLUMNS.LARGE
                            )
                        );
                    }}
                    title="Large thumbnail view"
                    iconProps={{ iconName: "Photo2", className: styles.largeFont }}
                />
                <IconButton
                    className={classNames(styles.iconButton, {
                        [styles.disabled]:
                            shouldDisplayThumbnailView &&
                            fileGridColumnCount === THUMBNAIL_SIZE_TO_NUM_COLUMNS.SMALL,
                    })}
                    disabled={
                        shouldDisplayThumbnailView &&
                        fileGridColumnCount === THUMBNAIL_SIZE_TO_NUM_COLUMNS.SMALL
                    }
                    onClick={() => {
                        dispatch(selection.actions.setFileThumbnailView(true));
                        dispatch(
                            selection.actions.setFileGridColumnCount(
                                THUMBNAIL_SIZE_TO_NUM_COLUMNS.SMALL
                            )
                        );
                    }}
                    title="Small thumbnail view"
                    iconProps={{ iconName: "Photo2", className: styles.smallFont }}
                />
            </div>
            <div className={styles.buttonGroup}>
                <ActionButton
                    className={classNames(styles.iconButton, styles.largeFont, {
                        [styles.disabled]: !shouldDisplaySmallFont,
                    })}
                    disabled={!shouldDisplaySmallFont}
                    onClick={() =>
                        dispatch(selection.actions.adjustGlobalFontSize(!shouldDisplaySmallFont))
                    }
                    title="Large font size"
                    text="a"
                />
                <ActionButton
                    className={classNames(styles.iconButton, styles.smallFont, {
                        [styles.disabled]: shouldDisplaySmallFont,
                    })}
                    disabled={shouldDisplaySmallFont}
                    onClick={() =>
                        dispatch(selection.actions.adjustGlobalFontSize(!shouldDisplaySmallFont))
                    }
                    title="Small font size"
                    text="a"
                />
            </div>
        </div>
    );
}
