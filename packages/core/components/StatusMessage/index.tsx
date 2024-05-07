import {
    MessageBar,
    MessageBarType,
    ProgressIndicator,
    Spinner,
    SpinnerSize,
    Stack,
    DefaultButton,
} from "@fluentui/react";
import classNames from "classnames";
import { map } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction } from "../../state";
import { StatusUpdate, ProcessStatus } from "../../state/interaction/actions";

import styles from "./StatusMessage.module.css";

const statusToTypeMap = {
    [ProcessStatus.STARTED]: MessageBarType.info,
    [ProcessStatus.PROGRESS]: MessageBarType.info,
    [ProcessStatus.SUCCEEDED]: MessageBarType.success,
    [ProcessStatus.FAILED]: MessageBarType.error,
    [ProcessStatus.NOT_SET]: MessageBarType.info,
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
            {map(
                useSelector(interaction.selectors.getProcessStatuses),
                (statusUpdate: StatusUpdate) => {
                    const {
                        data: { msg, status = ProcessStatus.NOT_SET, progress },
                        onCancel,
                    } = statusUpdate;
                    let cancelButton;
                    if (onCancel) {
                        cancelButton = <DefaultButton onClick={onCancel}>Cancel</DefaultButton>;
                    }

                    return (
                        <MessageBar
                            className={classNames(styles.messageBar, {
                                [styles.success]: status === ProcessStatus.SUCCEEDED,
                                [styles.error]: status === ProcessStatus.FAILED,
                            })}
                            actions={cancelButton}
                            key={statusUpdate.processId}
                            messageBarType={statusToTypeMap[status]}
                            onDismiss={() =>
                                dispatch(interaction.actions.removeStatus(statusUpdate.processId))
                            }
                            isMultiline={msg !== undefined}
                        >
                            <div className={styles.centeringParent}>
                                {progress === undefined && status === ProcessStatus.STARTED && (
                                    <Spinner className={styles.spinner} size={SpinnerSize.small} />
                                )}
                                <div
                                    dangerouslySetInnerHTML={{ __html: msg }}
                                    style={{ userSelect: "text" }}
                                ></div>
                            </div>
                            {progress !== undefined && (
                                <ProgressIndicator
                                    className={styles.progressIndicator}
                                    percentComplete={progress}
                                />
                            )}
                        </MessageBar>
                    );
                }
            )}
        </Stack>
    );
}
