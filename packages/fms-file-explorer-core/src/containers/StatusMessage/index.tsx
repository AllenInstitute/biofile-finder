import { map } from "lodash";
import { MessageBar, MessageBarType } from "office-ui-fabric-react";
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
const MESSAGE_BAR_STEP_HEIGHT = 35; // px; each MessageBar renders to about 32px, so space them a few pixels apart

export default function StatusMessage() {
    const dispatch = useDispatch();

    return (
        <>
            {map(
                useSelector(interaction.selectors.getProcessStatuses),
                (status: StatusUpdate, idx) => {
                    return (
                        <MessageBar
                            key={status.id}
                            className={styles.message}
                            messageBarType={statusToTypeMap[status.status]}
                            onDismiss={() => dispatch(interaction.actions.clearStatus(status.id))}
                            styles={{
                                root: {
                                    top: SPACING + idx * MESSAGE_BAR_STEP_HEIGHT,
                                    backgroundColor: statusToBackgroundColorMap[status.status],
                                },
                            }}
                        >
                            {`${processToDisplayTextMap[status.process]} ${
                                statusToDisplayTextMap[status.status]
                            }`}
                        </MessageBar>
                    );
                }
            )}
        </>
    );
}
