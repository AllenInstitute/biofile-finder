import { IconButton } from "@fluentui/react";
import { throttle } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

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
    const processStatuses = useSelector(interaction.selectors.getProcessStatuses);

    // Prevent triggering multiple downloads accidentally -- throttle with a 1s wait
    const onClick = React.useCallback(() => {
        if (!fileDetails) {
            return;
        }

        throttle(() => {
            dispatch(
                interaction.actions.downloadFile({
                    id: fileDetails.id,
                    name: fileDetails.name,
                    path: fileDetails.path,
                    size: fileDetails.size,
                })
            );
        }, 1000); // in ms
    }, [dispatch, fileDetails]);

    if (!fileDetails) {
        return null;
    }

    return (
        <IconButton
            ariaLabel="Download file"
            disabled={processStatuses.some((status) =>
                status.data.fileId?.includes(fileDetails.id)
            )}
            iconProps={{ iconName: "Download" }}
            onClick={onClick}
            styles={ICON_BUTTON_STYLES}
            title="Download file"
        />
    );
}
