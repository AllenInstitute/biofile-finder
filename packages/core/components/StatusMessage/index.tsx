import {
    MessageBar,
    MessageBarType,
    ProgressIndicator,
    Spinner,
    SpinnerSize,
    Stack,
} from "@fluentui/react";
import classNames from "classnames";
import { map } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { SecondaryButton } from "../Buttons";
import { interaction } from "../../state";
import { StatusUpdate, ProcessStatus } from "../../state/interaction/actions";

import styles from "./StatusMessage.module.css";

const statusToTypeMap = {
    [ProcessStatus.STARTED]: MessageBarType.info,
    [ProcessStatus.PROGRESS]: MessageBarType.info,
    [ProcessStatus.SUCCEEDED]: MessageBarType.success,
    [ProcessStatus.FAILED]: MessageBarType.error,
    [ProcessStatus.NOT_SET]: MessageBarType.info,
    [ProcessStatus.WARNING]: MessageBarType.severeWarning,
    [ProcessStatus.ERROR]: MessageBarType.severeWarning,
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
        <Stack {...verticalStackProps} verticalAlign="end" className={styles.container}>
            {map(
                useSelector(interaction.selectors.getProcessStatuses),
                (statusUpdate: StatusUpdate) => {
                    const {
                        data: { msg, status = ProcessStatus.NOT_SET, progress },
                        onCancel,
                    } = statusUpdate;
                    let onDismiss; // If has cancel option, don't show dismiss button
                    let cancelButton;
                    if (onCancel) {
                        cancelButton = (
                            <SecondaryButton
                                iconName=""
                                title="Cancel"
                                text="CANCEL"
                                onClick={onCancel}
                            />
                        );
                    } else
                        onDismiss = () =>
                            dispatch(interaction.actions.removeStatus(statusUpdate.processId));

                    return (
                        <MessageBar
                            className={classNames(styles.messageBar, {
                                [styles.success]: status === ProcessStatus.SUCCEEDED,
                                [styles.warning]: status === ProcessStatus.WARNING,
                                [styles.error]:
                                    status === ProcessStatus.FAILED ||
                                    status === ProcessStatus.ERROR,
                            })}
                            actions={cancelButton}
                            key={statusUpdate.processId}
                            messageBarType={statusToTypeMap[status]}
                            styles={{
                                iconContainer:
                                    status === ProcessStatus.STARTED
                                        ? styles.iconContainerHidden
                                        : styles.iconContainer,
                                innerText: styles.messageBarInnerText,
                                actions: styles.messageBarActions,
                            }}
                            onDismiss={onDismiss}
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
