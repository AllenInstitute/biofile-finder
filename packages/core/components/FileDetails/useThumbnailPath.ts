import * as React from "react";
import { useEffect } from "react";

import FileDetail from "../../entity/FileDetail";
import type { ThumbnailConfig, ZarrInfo } from "../../entity/FileDetail/RenderZarrThumbnailURL";

/**
 * Hook for async grabbing the thumbnail path for a file
 */
export default (
    fileDetails?: FileDetail,
    thumbnailConfig?: ThumbnailConfig
): {
    isThumbnailLoading: boolean;
    thumbnailPath: string | undefined;
    zarrInfo: ZarrInfo | undefined;
} => {
    const [isThumbnailLoading, setIsThumbnailLoading] = React.useState(true);
    const [thumbnailPath, setThumbnailPath] = React.useState<string | undefined>();
    const [zarrInfo, setZarrInfo] = React.useState<ZarrInfo | undefined>();

    useEffect(() => {
        // Clear stored zarr dimensions when file changes
        setZarrInfo(undefined);
    }, [fileDetails]);

    useEffect(() => {
        const controller = new AbortController();
        if (fileDetails) {
            setIsThumbnailLoading(true);
            const onLoad = (zarrInfo: ZarrInfo) => {
                if (controller.signal.aborted) {
                    return;
                }
                setZarrInfo(zarrInfo);
            };
            fileDetails
                .getPathToThumbnail(300, thumbnailConfig, controller.signal, onLoad)
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

    return { isThumbnailLoading, thumbnailPath, zarrInfo };
};
