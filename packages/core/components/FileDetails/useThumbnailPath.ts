import * as React from "react";

import FileDetail from "../../entity/FileDetail";
import type { ThumbnailConfig, ZarrDims } from "../../entity/FileDetail/RenderZarrThumbnailURL";

/**
 * Hook for async grabbing the thumbnail path for a file
 */
export default (fileDetails?: FileDetail, thumbnailConfig?: ThumbnailConfig) => {
    const [isThumbnailLoading, setIsThumbnailLoading] = React.useState(true);
    const [thumbnailPath, setThumbnailPath] = React.useState<string | undefined>();
    const [zarrDims, setZarrDims] = React.useState<ZarrDims | undefined>();

    React.useEffect(() => {
        const controller = new AbortController();
        if (fileDetails) {
            setIsThumbnailLoading(true);
            fileDetails
                .getPathToThumbnail(300, thumbnailConfig, controller.signal, setZarrDims)
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

    return { isThumbnailLoading, thumbnailPath, zarrDims };
};
