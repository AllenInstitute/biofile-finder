// import classNames from "classnames";
import { IconButton } from "@fluentui/react";
import * as React from "react";
import { useDispatch } from "react-redux";

import { interaction } from "../../state";
import FileDetail from "../../entity/FileDetail";

interface DownloadProps {
    className?: string;
    fileDetails: FileDetail | null;
}

const ICON_BUTTON_STYLES = {
    icon: {
        color: "black",
        fontSize: "13px",
    },
    root: {
        background: "none",
        height: 18,
        width: 24,
    },
};

/**
 * UI for paging through selected files within the FileDetails pane.
 */
export default function Download(props: DownloadProps) {
    const { fileDetails } = props;

    const dispatch = useDispatch();

    if (!fileDetails) {
        return null;
    }

    return (
        <IconButton
            ariaLabel="Download file"
            iconProps={{ iconName: "Download" }}
            onClick={() => {
                dispatch(interaction.actions.downloadFile(fileDetails.path));
            }}
            styles={ICON_BUTTON_STYLES}
            title="Download file"
        />
    );
}
