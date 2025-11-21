import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { TransparentIconButton } from "../Buttons";
import SvgIcon from "../SvgIcon";
import Tooltip from "../Tooltip";
import { selection } from "../../state";
import { FocusDirective } from "../../entity/FileSelection";
import { CHEVRON_END_PATH_DATA, CHEVRON_START_PATH_DATA, CHEVRON_VIEW_BOX } from "../../icons";

import styles from "./Pagination.module.css";

interface PaginationProps {
    className?: string;
}

/**
 * UI for paging through selected files within the FileDetails pane.
 */
export default function Pagination(props: PaginationProps) {
    const dispatch = useDispatch();
    const fileSelection = useSelector(selection.selectors.getFileSelection);

    // Allow pagination to "roll over" back to the beginning/end
    const onClickPrevious = () => {
        if (!fileSelection.hasPreviousFocusableItem()) {
            dispatch(selection.actions.setFileSelection(fileSelection.focus(FocusDirective.LAST)));
        } else
            dispatch(
                selection.actions.setFileSelection(fileSelection.focus(FocusDirective.PREVIOUS))
            );
    };
    const onClickNext = () => {
        if (!fileSelection.hasNextFocusableItem()) {
            dispatch(selection.actions.setFileSelection(fileSelection.focus(FocusDirective.FIRST)));
        } else
            dispatch(selection.actions.setFileSelection(fileSelection.focus(FocusDirective.NEXT)));
    };

    return (
        <div
            data-testid="pagination-root"
            className={classNames(styles.root, props.className, {
                [styles.hidden]: fileSelection.count() <= 1,
            })}
        >
            <div className={styles.alignCenter}>
                <Tooltip content="Jump to first selected file">
                    <SvgIcon
                        className={classNames(styles.svgIcon, styles.alignCenter)}
                        height={28}
                        pathData={CHEVRON_START_PATH_DATA}
                        viewBox={CHEVRON_VIEW_BOX}
                        onClick={() =>
                            dispatch(
                                selection.actions.setFileSelection(
                                    fileSelection.focus(FocusDirective.FIRST)
                                )
                            )
                        }
                    />
                </Tooltip>
                <TransparentIconButton
                    className={styles.chevronButton}
                    iconName={"ChevronLeftMed"}
                    onClick={onClickPrevious}
                    title="View previous selected file"
                />
            </div>
            <div className={styles.pageCount}>
                {(fileSelection.getFocusedItemIndices().indexAcrossAllSelections || 0) + 1}/
                {fileSelection.count()}
            </div>
            <div className={styles.alignCenter}>
                <TransparentIconButton
                    className={styles.chevronButton}
                    iconName={"ChevronRightMed"}
                    onClick={onClickNext}
                    title="View next selected file"
                />
                <Tooltip content="Jump to last selected file">
                    <SvgIcon
                        className={classNames(styles.svgIcon, styles.alignCenter)}
                        height={28}
                        pathData={CHEVRON_END_PATH_DATA}
                        viewBox={CHEVRON_VIEW_BOX}
                        onClick={() =>
                            dispatch(
                                selection.actions.setFileSelection(
                                    fileSelection.focus(FocusDirective.LAST)
                                )
                            )
                        }
                    />
                </Tooltip>
            </div>
        </div>
    );
}
