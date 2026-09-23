import * as React from "react";

import FileDetail from "../../entity/FileDetail";
import type { ThumbnailConfig } from "../../state/selection/actions";

/**
 * Hook for async grabbing the thumbnail path for a file
 */
export default (fileDetails?: FileDetail, thumbnailConfig?: ThumbnailConfig) => {
    const [isThumbnailLoading, setIsThumbnailLoading] = React.useState(true);
    const [thumbnailPath, setThumbnailPath] = React.useState<string | undefined>();

    React.useEffect(() => {
        if (fileDetails) {
            setIsThumbnailLoading(true);
            fileDetails
                .getPathToThumbnail(300, thumbnailConfig)
                .then((path) => {
                    setThumbnailPath(path);
                })
                .finally(() => {
                    setIsThumbnailLoading(false);
                });
        }
    }, [fileDetails, setIsThumbnailLoading, setThumbnailPath, thumbnailConfig]);

    return { isThumbnailLoading, thumbnailPath };
};
