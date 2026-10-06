import * as React from "react";

import FileDetail from "../../entity/FileDetail";
import type { ThumbnailConfig } from "../../entity/FileDetail/RenderZarrThumbnailURL";

/**
 * Hook for async grabbing the thumbnail path for a file
 */
export default (fileDetails?: FileDetail, thumbnailConfig?: ThumbnailConfig) => {
    const [isThumbnailLoading, setIsThumbnailLoading] = React.useState(true);
    const [thumbnailPath, setThumbnailPath] = React.useState<string | undefined>();

    // TODO: Use AbortSignals to cancel request if dependencies change.
    React.useEffect(() => {
        const controller = new AbortController();
        if (fileDetails) {
            setIsThumbnailLoading(true);
            fileDetails
                .getPathToThumbnail(300, thumbnailConfig, controller.signal)
                .then((path) => {
                    if (controller.signal.aborted) {
                        return;
                    }
                    setThumbnailPath(path);
                })
                .finally(() => {
                    if (controller.signal.aborted) {
                        return;
                    }
                    setIsThumbnailLoading(false);
                });
        }
        return () => {
            controller.abort();
        };
    }, [fileDetails, thumbnailConfig]);

    return { isThumbnailLoading, thumbnailPath };
};
