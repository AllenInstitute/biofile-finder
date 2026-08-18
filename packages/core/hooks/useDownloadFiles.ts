import { throttle } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import FileDetail from "../entity/FileDetail";
import { interaction } from "../state";

/**
 * Hook for retrieving file download information including callback for downloading
 * the file given
 */
export default (fileDetails?: FileDetail) => {
    const dispatch = useDispatch();

    const processStatuses = useSelector(interaction.selectors.getProcessStatuses);

    const isBeingDownloaded = processStatuses.some(
        (status) => fileDetails && status.data.fileId?.includes(fileDetails.uid)
    );
    const isDownloadDisabled = !fileDetails || isBeingDownloaded;

    // Display a tooltip if download is disabled
    const disabledDownloadReason = React.useMemo(() => {
        if (!isDownloadDisabled) return;
        if (!fileDetails) return "File details not available";
        if (isBeingDownloaded) return "Download already in progress";
        // Otherwise, fileId is in processStatuses and details are visible to user there
        return "Download disabled";
    }, [fileDetails, isBeingDownloaded, isDownloadDisabled]);

    // Prevent triggering multiple downloads accidentally -- throttle with a 1s wait
    const onDownload = React.useMemo(
        () =>
            throttle(() => {
                if (fileDetails) {
                    dispatch(
                        interaction.actions.downloadFiles([
                            {
                                id: fileDetails.uid,
                                name: fileDetails.name,
                                size: fileDetails.size,
                                path: fileDetails.path,
                            },
                        ])
                    );
                }
            }, 1000),
        [dispatch, fileDetails]
    );

    return {
        onDownload,
        isDownloadDisabled,
        disabledDownloadReason,
    };
};
