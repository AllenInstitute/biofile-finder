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
    const onClick = React.useMemo(() => {
        if (!fileDetails) {
            return () => {
                /** noop */
            };
        }

        return throttle(() => {
            dispatch(interaction.actions.downloadFile(fileDetails.details));
        }, 1000); // 1s, in ms (arbitrary)
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
