import { DefaultButton } from "@fluentui/react";
import { throttle } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction } from "../../state";
import FileDetail from "../../entity/FileDetail";

interface DownloadProps {
    className?: string;
    fileDetails: FileDetail | null;
}

/**
 * Button for dispatching an event declaring intention to download a file.
 */
export default function Download(props: DownloadProps) {
    const { fileDetails } = props;

    const dispatch = useDispatch();
    const processStatuses = useSelector(interaction.selectors.getProcessStatuses);

    // Prevent triggering multiple downloads accidentally -- throttle with a 1s wait
    const onDownload = React.useMemo(() => {
        if (!fileDetails) {
            return () => {
                /** noop */
            };
        }

        return throttle(() => {
            dispatch(
                interaction.actions.downloadFiles([
                    {
                        id: fileDetails.id,
                        name: fileDetails.name,
                        size: fileDetails.size,
                        path: fileDetails.downloadPath,
                    },
                ])
            );
        }, 1000); // 1s, in ms (arbitrary)
    }, [dispatch, fileDetails]);

    if (!fileDetails) {
        return null;
    }

    return (
        <DefaultButton
            ariaLabel="Download file"
            className={props.className}
            iconProps={{ iconName: "Download" }}
            disabled={processStatuses.some((status) =>
                status.data.fileId?.includes(fileDetails.id)
            )}
            onClick={onDownload}
            title="Download"
            text="Download"
        />
    );
}
