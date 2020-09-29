import classNames from "classnames";
import { IconButton } from "office-ui-fabric-react";
import * as React from "react";

interface PaginationProps {
    className?: string;
}

/**
 * UI for paging through selected files within the FileDetails pane.
 */
export default function Pagination(props: PaginationProps) {
    return (
        <div className={classNames(props.className)}>
            <div>
                <IconButton
                    iconProps={{ iconName: "ChevronLeftEnd6" }}
                />
                <IconButton
                    iconProps={{ iconName: "ChevronLeftSmall" }}
                />
            </div>
            <div>
                <IconButton
                    iconProps={{ iconName: "ChevronRightSmall" }}
                />
                <IconButton
                    iconProps={{ iconName: "ChevronRightEnd6" }}
                />
            </div>
        </div>
    );
}