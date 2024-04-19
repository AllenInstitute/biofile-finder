import classNames from "classnames";
import { IconButton } from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

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
                <IconButton
                    ariaLabel="Jump to first selected file"
                    className={classNames(styles.iconButton, {
                        [styles.disabled]: !fileSelection.hasPreviousFocusableItem(),
                    })}
                    disabled={!fileSelection.hasPreviousFocusableItem()}
                    iconProps={{ iconName: "ChevronLeftEnd6" }}
                    onClick={() =>
                        dispatch(
                            selection.actions.setFileSelection(
                                fileSelection.focus(FocusDirective.FIRST)
                            )
                        )
                    }
                    title="Jump to first selected file"
                />
                <IconButton
                    ariaLabel="View previous selected file"
                    className={classNames(styles.iconButton, {
                        [styles.disabled]: !fileSelection.hasPreviousFocusableItem(),
                    })}
                    disabled={!fileSelection.hasPreviousFocusableItem()}
                    iconProps={{ iconName: "ChevronLeftSmall" }}
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
                <IconButton
                    ariaLabel="View next selected file"
                    className={classNames(styles.iconButton, {
                        [styles.disabled]: !fileSelection.hasNextFocusableItem(),
                    })}
                    disabled={!fileSelection.hasNextFocusableItem()}
                    iconProps={{ iconName: "ChevronRightSmall" }}
                    onClick={() =>
                        dispatch(
                            selection.actions.setFileSelection(
                                fileSelection.focus(FocusDirective.NEXT)
                            )
                        )
                    }
                    title="View next selected file"
                />
                <IconButton
                    ariaLabel="Jump to last selected file"
                    className={classNames(styles.iconButton, {
                        [styles.disabled]: !fileSelection.hasNextFocusableItem(),
                    })}
                    disabled={!fileSelection.hasNextFocusableItem()}
                    iconProps={{ iconName: "ChevronRightEnd6" }}
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
