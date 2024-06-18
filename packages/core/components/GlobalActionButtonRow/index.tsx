import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { TertiaryButton } from "../Buttons";
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
                <TertiaryButton
                    className={styles.listViewButton}
                    iconName="NumberedListText"
                    isSelected={!shouldDisplayThumbnailView}
                    onClick={() =>
                        dispatch(
                            selection.actions.setFileThumbnailView(!shouldDisplayThumbnailView)
                        )
                    }
                    title="List view"
                />
                <TertiaryButton
                    iconName="GridViewMedium"
                    isSelected={
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
                />
                <TertiaryButton
                    iconName="GridViewSmall"
                    isSelected={
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
                />
            </div>
            <div className={styles.buttonGroup}>
                <TertiaryButton
                    iconName="FontIncrease"
                    isSelected={!shouldDisplaySmallFont}
                    onClick={() =>
                        dispatch(selection.actions.adjustGlobalFontSize(!shouldDisplaySmallFont))
                    }
                    title="Large font size"
                />
                <TertiaryButton
                    iconName="FontDecrease"
                    isSelected={shouldDisplaySmallFont}
                    onClick={() =>
                        dispatch(selection.actions.adjustGlobalFontSize(!shouldDisplaySmallFont))
                    }
                    title="Small font size"
                />
            </div>
        </div>
    );
}
