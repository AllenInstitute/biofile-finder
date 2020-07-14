import { map } from "lodash";
import { MessageBar, MessageBarType, Spinner, SpinnerSize, Stack } from "office-ui-fabric-react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction } from "../../state";
import { StatusUpdate, ProcessStatus, Process } from "../../state/interaction/actions";

const styles = require("./StatusMessage.module.css");

const statusToTypeMap = {
    [ProcessStatus.STARTED]: MessageBarType.info,
    [ProcessStatus.SUCCEEDED]: MessageBarType.success,
    [ProcessStatus.FAILED]: MessageBarType.error,
};

const statusToBackgroundColorMap = {
    [ProcessStatus.STARTED]: "rgb(243, 242, 241)", // gray
    [ProcessStatus.SUCCEEDED]: "rgb(95, 210, 85)", // green
    [ProcessStatus.FAILED]: "rgb(245, 135, 145)", // red
};

const statusToDisplayTextMap = {
    [ProcessStatus.STARTED]: "in progress.",
    [ProcessStatus.SUCCEEDED]: "successfully finished.",
    [ProcessStatus.FAILED]: "failed.",
};

const processToDisplayTextMap = {
    [Process.MANIFEST_DOWNLOAD]: "Download of CSV manifest",
};

const SPACING = 5; // px
const verticalStackProps = {
    styles: {
        root: {
            top: SPACING,
        },
    },
    tokens: {
        childrenGap: SPACING,
    },
};

/**
 * Pop-up banners that display status messages of processes, such as the download of a CSV manifest. They
 * stack vertically at the top of the window.
 */
export default function StatusMessage() {
    const dispatch = useDispatch();

    return (
        <Stack {...verticalStackProps} className={styles.container}>
            {map(useSelector(interaction.selectors.getProcessStatuses), (status: StatusUpdate) => {
                const message = status.data?.msg;

                return (
                    <MessageBar
                        key={status.id}
                        messageBarType={statusToTypeMap[status.status]}
                        onDismiss={() => dispatch(interaction.actions.clearStatus(status.id))}
                        styles={{
                            root: {
                                backgroundColor: statusToBackgroundColorMap[status.status],
                            },
                        }}
                        isMultiline={message !== undefined}
                    >
                        <>
                            <div className={styles.centeringParent}>
                                {status.status === ProcessStatus.STARTED && (
                                    <Spinner className={styles.spinner} size={SpinnerSize.small} />
                                )}
                                {`${processToDisplayTextMap[status.process]} ${
                                    statusToDisplayTextMap[status.status]
                                }`}
                            </div>
                            {message}
                        </>
                    </MessageBar>
                );
            })}
        </Stack>
    );
}
