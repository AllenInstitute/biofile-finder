import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { TertiaryButton } from "../Buttons";
import { FileView } from "../../entity/FileExplorerURL";
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
    const fileView = useSelector(selection.selectors.getFileView);
    const shouldDisplaySmallFont = useSelector(selection.selectors.getShouldDisplaySmallFont);

    return (
        <div className={classNames(styles.container, props.className)}>
            <div className={styles.buttonGroup}>
                <TertiaryButton
                    className={styles.listViewButton}
                    iconName="NumberedListText"
                    disabled={fileView === FileView.LIST}
                    isSelected={fileView === FileView.LIST}
                    onClick={() => dispatch(selection.actions.setFileView(FileView.LIST))}
                    title="List view"
                />
                <TertiaryButton
                    iconName="GridViewMedium"
                    disabled={fileView === FileView.LARGE_THUMBNAIL}
                    isSelected={fileView === FileView.LARGE_THUMBNAIL}
                    onClick={() => {
                        dispatch(selection.actions.setFileView(FileView.LARGE_THUMBNAIL));
                    }}
                    title="Large thumbnail view"
                />
                <TertiaryButton
                    iconName="GridViewSmall"
                    disabled={fileView === FileView.SMALL_THUMBNAIL}
                    isSelected={fileView === FileView.SMALL_THUMBNAIL}
                    onClick={() => {
                        dispatch(selection.actions.setFileView(FileView.SMALL_THUMBNAIL));
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
