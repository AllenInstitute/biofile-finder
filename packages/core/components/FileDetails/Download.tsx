import { IconButton } from "@fluentui/react";
import { throttle } from "lodash";
import * as React from "react";
import { useDispatch } from "react-redux";

import { interaction } from "../../state";
import FileDetail from "../../entity/FileDetail";

interface DownloadProps {
    fileDetails: FileDetail | null;
}

const ICON_BUTTON_STYLES = {
    icon: {
        color: "black",
        fontSize: "13px",
    },
    root: {
        background: "none",
        height: 24,
        width: 24,
    },
};

/**
 * Button for dispatching an event declaring intention to download a file.
 */
export default function Download(props: DownloadProps) {
    const { fileDetails } = props;

    const dispatch = useDispatch();

    if (!fileDetails) {
        return null;
    }

    // Prevent triggering multiple downloads accidentally -- throttle with a 1s wait
    const onClick = throttle(() => {
        dispatch(
            interaction.actions.downloadFile({
                name: fileDetails.name,
                path: fileDetails.path,
                size: fileDetails.size,
            })
        );
    }, 1000); // in ms

    return (
        <IconButton
            ariaLabel="Download file"
            iconProps={{ iconName: "Download" }}
            onClick={onClick}
            styles={ICON_BUTTON_STYLES}
            title="Download file"
        />
    );
}
