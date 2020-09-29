import { isUndefined } from "lodash";
import * as React from "react";
import { useSelector } from "react-redux";

import FileDetail from "../../entity/FileDetail";
import { FmsFile } from "../../services/FileService";
import { selection } from "../../state";

/**
 * Custom React hook to accomplish storing and fetching details of files (i.e., complex file metadata).
 * This hook exposes loading state for the requested fileId: if a network request is in flight for file details
 * for the requested fileId, the second element of the return array will be true.
 */
export default function useFileDetails(): [FileDetail | null, boolean] {
    const fileSelection = useSelector(selection.selectors.getFileSelection);

    const [fileDetails, setFileDetails] = React.useState<FileDetail | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);

    React.useEffect(() => {
        // This tracking variable allows us to avoid a call to setDetailsCache (which triggers a re-render) if the
        // effect is rerun prior to a successful network response. This could be the case if a user makes a file
        // selection then quickly makes a new selection.
        let ignoreResponse = false;

        // cache miss, check if file set cache has record of this index
        setIsLoading(true);
        fileSelection
            .fetchFocusedItemDetails()
            .then((fmsfile: FmsFile | undefined) => {
                if (ignoreResponse) {
                    return;
                }

                if (isUndefined(fmsfile)) {
                    setFileDetails(null);
                } else {
                    const detail = new FileDetail(fmsfile);
                    setFileDetails(detail);
                }
            })
            .catch(console.error)
            .finally(() => {
                if (!ignoreResponse) {
                    setIsLoading(false);
                }
            });

        return function cleanup() {
            ignoreResponse = true;
        };
    }, [fileSelection]);

    return [fileDetails, isLoading];
}
