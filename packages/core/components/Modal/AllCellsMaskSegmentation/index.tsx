import { Icon, TextField, TooltipHost } from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import { PrimaryButton, SecondaryButton } from "../../Buttons";
import AnnotationName from "../../../entity/Annotation/AnnotationName";
import FileSelection from "../../../entity/FileSelection";
import { interaction, selection } from "../../../state";

import styles from "./AllCellsMaskSegmentation.module.css";

type Status = "idle" | "submitting" | "submitted" | "error";

type UIOpts = {
    channelIndex: string;
};

const PROCESS_ID = "acmJob";

/**
 * Modal for submitting an All Cells Mask segmentation job via the compute pipeline.
 * Requires all selected files to have a valid local (VAST) path before submission.
 */
export default function AllCellsMaskSegmentation({ onDismiss }: ModalProps) {
    const dispatch = useDispatch();

    const fileSelection = useSelector(
        selection.selectors.getFileSelection,
        FileSelection.selectionsAreEqual
    );

    const httpFileService = useSelector(interaction.selectors.getHttpFileService);

    const [opts, setOpts] = React.useState<UIOpts>({
        channelIndex: "0",
    });

    const [status, setStatus] = React.useState<Status>("idle");
    const [dashboardUrl, setDashboardUrl] = React.useState<string | null>(null);
    const [computeTaskId, setComputeTaskId] = React.useState<string | null>(null);
    const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
    const [localFilePaths, setLocalFilePaths] = React.useState<string[] | null>(null);

    React.useEffect(() => {
        let cancelled = false;

        (async () => {
            const details = await fileSelection.fetchAllDetails();
            if (cancelled) return;

            const paths: string[] = [];
            for (const d of details) {
                const shouldBeInLocal = d.getFirstAnnotationValue(
                    AnnotationName.SHOULD_BE_IN_LOCAL
                );
                const localPath = d.getFirstAnnotationValue(AnnotationName.LOCAL_FILE_PATH);
                if (!shouldBeInLocal || !localPath) {
                    setLocalFilePaths(null);
                    return;
                }
                paths.push(localPath as string);
            }
            setLocalFilePaths(paths);
        })();

        return () => {
            cancelled = true;
        };
    }, [fileSelection]);

    const openDashboard = () => {
        if (!dashboardUrl) return;
        window.open(dashboardUrl, "_blank", "noopener,noreferrer");
    };

    const onSubmit = async () => {
        if (status !== "idle" || !localFilePaths?.length) return;

        setStatus("submitting");
        setStatusMessage(null);

        try {
            dispatch(
                interaction.actions.processStart(PROCESS_ID, "Submitting All Cells Mask job...")
            );

            const trimmed = opts.channelIndex.trim();
            if (trimmed && !/^\d+$/.test(trimmed)) {
                throw new Error("Channel index must be a non-negative integer.");
            }
            const channel = trimmed ? parseInt(trimmed, 10) : 0;
            const scene = 0;

            const { computeTaskId, dashboardUrl } = await httpFileService.submitAllCellsMaskJob({
                files: localFilePaths,
                scene,
                channel,
            });

            setComputeTaskId(computeTaskId ?? null);
            setDashboardUrl(dashboardUrl ?? null);
            setStatus("submitted");

            dispatch(
                interaction.actions.processSuccess(
                    PROCESS_ID,
                    "All Cells Mask job submitted successfully."
                )
            );
        } catch (err) {
            console.error(err);
            setStatus("error");
            setStatusMessage(
                err instanceof Error
                    ? err.message
                    : "An error occurred while submitting the All Cells Mask job."
            );

            dispatch(
                interaction.actions.processError(PROCESS_ID, "Failed to submit All Cells Mask job.")
            );
        }
    };

    const submitDisabled = status !== "idle" || !localFilePaths;

    const submitTooltip = !localFilePaths
        ? "All selected files must be available locally before submitting this job."
        : "This job has already been submitted.";

    const body = (
        <div className={styles.shell}>
            <div className={styles.columns}>
                <div className={styles.leftCol}>
                    <div className={styles.section}>
                        <div className={styles.label}>Channel</div>
                        <div className={styles.searchBox}>
                            <TextField
                                value={opts.channelIndex}
                                type="number"
                                onChange={(_, v) =>
                                    setOpts((o) => ({
                                        ...o,
                                        channelIndex: (v ?? "0").replace(/[^\d]/g, ""),
                                    }))
                                }
                                placeholder="0"
                                borderless
                            />
                        </div>
                    </div>
                </div>

                <div className={styles.rightCol}>
                    {status === "idle" && (
                        <>
                            <h4>About this workflow</h4>
                            <p className={styles.text}>
                                The All Cells Mask workflow generates segmentation masks for the
                                selected files. After submission, you can monitor progress in the
                                job dashboard.
                            </p>
                        </>
                    )}

                    {status === "submitting" && (
                        <>
                            <h4>Submitting job</h4>
                            <p className={styles.text}>Your request is being submitted.</p>
                        </>
                    )}

                    {status === "submitted" && computeTaskId && (
                        <>
                            <h4>Job submitted</h4>
                            <p className={styles.text}>
                                <strong>Job ID:</strong> {computeTaskId}
                            </p>
                        </>
                    )}

                    {status === "error" && (
                        <div className={styles.errorBox}>
                            <div className={styles.errorTitle}>Submission failed</div>
                            <div className={styles.errorText}>{statusMessage}</div>
                        </div>
                    )}
                </div>
            </div>

            {status === "submitted" && (
                <div className={styles.fullWidthSuccess}>
                    <Icon iconName="CheckMark" />
                    Job submitted successfully
                </div>
            )}
        </div>
    );

    const footer = (
        <div className={styles.footerButtons}>
            <SecondaryButton
                onClick={onDismiss}
                text={status === "submitted" ? "CLOSE" : "CANCEL"}
            />

            {status === "submitted" && dashboardUrl ? (
                <PrimaryButton onClick={openDashboard} text="OPEN JOB DASHBOARD" />
            ) : submitDisabled ? (
                <TooltipHost content={submitTooltip}>
                    <div>
                        <PrimaryButton onClick={onSubmit} text="SUBMIT" disabled />
                    </div>
                </TooltipHost>
            ) : (
                <PrimaryButton onClick={onSubmit} text="SUBMIT" />
            )}
        </div>
    );

    return (
        <BaseModal
            title="Compute All Cells Mask"
            body={body}
            footer={footer}
            isStatic
            onDismiss={onDismiss}
        />
    );
}
