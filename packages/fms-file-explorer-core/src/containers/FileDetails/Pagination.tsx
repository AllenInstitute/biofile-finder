import classNames from "classnames";
import { IconButton } from "office-ui-fabric-react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { selection } from "../../state";
import { FocusDirective } from "../../entity/FileSelection";

interface PaginationProps {
    className?: string;
}

/**
 * UI for paging through selected files within the FileDetails pane.
 */
export default function Pagination(props: PaginationProps) {
    const dispatch = useDispatch();
    const fileSelection = useSelector(selection.selectors.getFileSelection);

    const iconButtonStyles = React.useMemo(() => {
        return {
            icon: {
                color: "black",
                fontSize: "14px",
            },
            root: {
                background: "none",
                height: 18,
                width: 24,
            },
        };
    }, []);

    return (
        <div className={classNames(props.className)}>
            <div>
                <IconButton
                    aria-label="Jump to first selected file"
                    disabled={!fileSelection.hasPreviousFocusableItem()}
                    iconProps={{ iconName: "ChevronLeftEnd6" }}
                    onClick={() =>
                        dispatch(selection.actions.setFileSelection(fileSelection.focus(FocusDirective.FIRST)))
                    }
                    styles={iconButtonStyles}
                    title="Jump to first selected file"
                />
                <IconButton
                    aria-label="View previous selected file"
                    disabled={!fileSelection.hasPreviousFocusableItem()}
                    iconProps={{ iconName: "ChevronLeftSmall" }}
                    onClick={() =>
                        dispatch(selection.actions.setFileSelection(fileSelection.focus(FocusDirective.PREVIOUS)))
                    }
                    styles={iconButtonStyles}
                    title="View previous selected file"
                />
            </div>
            <div>
                <IconButton
                    aria-label="View next selected file"
                    disabled={!fileSelection.hasNextFocusableItem()}
                    iconProps={{ iconName: "ChevronRightSmall" }}
                    onClick={() =>
                        dispatch(selection.actions.setFileSelection(fileSelection.focus(FocusDirective.NEXT)))
                    }
                    styles={iconButtonStyles}
                    title="View next selected file"
                />
                <IconButton
                    aria-label="Jump to last selected file"
                    disabled={!fileSelection.hasNextFocusableItem()}
                    iconProps={{ iconName: "ChevronRightEnd6" }}
                    onClick={() =>
                        dispatch(selection.actions.setFileSelection(fileSelection.focus(FocusDirective.LAST)))
                    }
                    styles={iconButtonStyles}
                    title="Jump to last selected file"
                />
            </div>
        </div>
    );
}