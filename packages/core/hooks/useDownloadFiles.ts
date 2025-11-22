import { throttle } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import AnnotationName from "../entity/Annotation/AnnotationName";
import annotationFormatterFactory, { AnnotationType } from "../entity/AnnotationFormatter";
import FileDetail from "../entity/FileDetail";
import { MAX_DOWNLOAD_SIZE_WEB } from "../services/FileDownloadService";
import { interaction } from "../state";


/**
 * Hook for retrieving file download information including callback for downloading
 * the file given
 */
export default (fileDetails?: FileDetail) => {
    const isZarr = fileDetails?.path.endsWith(".zarr") || fileDetails?.path.endsWith(".zarr/");

    const dispatch = useDispatch();
    const [isFileTooBig, setIsFileTooBig] = React.useState<boolean | null>(null);

    const processStatuses = useSelector(interaction.selectors.getProcessStatuses);
    const isOnWeb = useSelector(interaction.selectors.isOnWeb);
    const { fileDownloadService } = useSelector(
        interaction.selectors.getPlatformDependentServices
    );

    React.useEffect(() => {
        let cancel = false;
        setIsFileTooBig(null);
        if (!isZarr) {
            setIsFileTooBig(false);
        } else if (fileDetails && !cancel && isOnWeb) {
            if (fileDetails.size) {
                setIsFileTooBig(fileDetails.size > MAX_DOWNLOAD_SIZE_WEB);
            } else {
                // Determine size of Zarr on web.
                fileDownloadService
                    .parseUrl(fileDetails.path)
                    .then((parsedUrl) => {
                        if (!parsedUrl) return;
                        fileDownloadService
                            .calculateS3DirectorySize(parsedUrl)
                            .then((size) => {
                                setIsFileTooBig(size > MAX_DOWNLOAD_SIZE_WEB);
                            });
                    });
            }
        }

        return function cleanup() {
            cancel = true;
        };
    }, [fileDetails, fileDownloadService, isOnWeb, isZarr]);

    // Disable download of large Zarrs ( > 2GB).
    const isBeingDownloaded = processStatuses.some((status) => fileDetails && status.data.fileId?.includes(fileDetails.uid));
    const isDownloadDisabled = !fileDetails || isBeingDownloaded || (isOnWeb && !!isZarr && !!isFileTooBig)

    // Display a tooltip if download is disabled
    const disabledDownloadReason = React.useMemo(() => {
        if (!isDownloadDisabled) return;
        if (!fileDetails) return "File details not available";
        if (isZarr && isOnWeb) {
            if (isFileTooBig === null) {
                return "Unable to determine size of .zarr file";
            } else if (isFileTooBig) {
                const downloadSizeString = annotationFormatterFactory(
                    AnnotationType.NUMBER
                ).displayValue(MAX_DOWNLOAD_SIZE_WEB, "bytes");
                return `File ${fileDetails.name} exceeds maximum download size of ${downloadSizeString}`;
            }
            return "Unable to download file. Upload files to an AWS S3 bucket to enable .zarr downloads";
        }
        // Otherwise, fileId is in processStatuses and details are visible to user there
        return "Download disabled";
    }, [isFileTooBig, fileDetails, isDownloadDisabled, isZarr, isOnWeb]);

    // Prevent triggering multiple downloads accidentally -- throttle with a 1s wait
    const onDownload = React.useCallback(throttle(() => {
        if (fileDetails) {
            dispatch(
                interaction.actions.downloadFiles([
                    {
                        id: fileDetails.uid,
                        name: fileDetails.name,
                        size: fileDetails.size,
                        path: fileDownloadService.isFileSystemAccessible
                            ? ((fileDetails.getFirstAnnotationValue(
                                    AnnotationName.LOCAL_FILE_PATH
                                ) || fileDetails.path) as string)
                            : fileDetails.path,
                    },
                ])
            );
        }
    }, 1000), [dispatch, fileDetails, fileDownloadService.isFileSystemAccessible]);

    return {
        onDownload,
        isDownloadDisabled,
        disabledDownloadReason,
    }
}