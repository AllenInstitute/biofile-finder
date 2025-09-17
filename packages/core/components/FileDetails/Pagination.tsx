import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { TertiaryButton } from "../Buttons";
import { selection } from "../../state";
import { FocusDirective } from "../../entity/FileSelection";

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

    return (
        <div className={classNames(styles.root, props.className)}>
            <div>
                <TertiaryButton
                    disabled={!fileSelection.hasPreviousFocusableItem()}
                    iconName="ChevronLeftEnd6"
                    onClick={() =>
                        dispatch(
                            selection.actions.setFileSelection(
                                fileSelection.focus(FocusDirective.FIRST)
                            )
                        )
                    }
                    title="Jump to first selected file"
                />
                <TertiaryButton
                    disabled={!fileSelection.hasPreviousFocusableItem()}
                    iconName="ChevronLeftSmall"
                    onClick={() =>
                        dispatch(
                            selection.actions.setFileSelection(
                                fileSelection.focus(FocusDirective.PREVIOUS)
                            )
                        )
                    }
                    title="View previous selected file"
                />
            </div>
            <div>
                <TertiaryButton
                    disabled={!fileSelection.hasNextFocusableItem()}
                    iconName="ChevronRightSmall"
                    onClick={() =>
                        dispatch(
                            selection.actions.setFileSelection(
                                fileSelection.focus(FocusDirective.NEXT)
                            )
                        )
                    }
                    title="View next selected file"
                />
                <TertiaryButton
                    disabled={!fileSelection.hasNextFocusableItem()}
                    iconName="ChevronRightEnd6"
                    onClick={() =>
                        dispatch(
                            selection.actions.setFileSelection(
                                fileSelection.focus(FocusDirective.LAST)
                            )
                        )
                    }
                    title="Jump to last selected file"
                />
            </div>
        </div>
    );
}
