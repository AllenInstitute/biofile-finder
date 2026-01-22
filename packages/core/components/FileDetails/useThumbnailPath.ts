import * as React from "react";

import FileDetail from "../../entity/FileDetail";


/**
 * Hook for async grabbing the thumbnail path for a file
 */
export default (fileDetails?: FileDetail) => {
    const [isThumbnailLoading, setIsThumbnailLoading] = React.useState(true);
    const [thumbnailPath, setThumbnailPath] = React.useState<string | undefined>();

    React.useEffect(() => {
        if (fileDetails) {
            setIsThumbnailLoading(true);
            fileDetails.getPathToThumbnail(300)
                .then((path) => {
                    setThumbnailPath(path);
                })
                .finally(() => {
                    setIsThumbnailLoading(false);
                });
        }
    }, [fileDetails, setIsThumbnailLoading, setThumbnailPath]);

    return { isThumbnailLoading, thumbnailPath };
};
