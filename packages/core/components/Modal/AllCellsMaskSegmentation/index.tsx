import { Icon, TextField, TooltipHost } from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import { PrimaryButton, SecondaryButton } from "../../Buttons";
import LoadingIcon from "../../Icons/LoadingIcon";
import FileSelection from "../../../entity/FileSelection";
import { interaction, selection } from "../../../state";

import styles from "./AllCellsMaskSegmentation.module.css";
import AnnotationName from "../../../entity/Annotation/AnnotationName";

type Status = "idle" | "submitting" | "waiting-for-manifest" | "ready" | "error";

type UIOpts = {
    sceneIndex: string;
    channelIndex: string;
};

export default function AllCellsMaskSegmentation({ onDismiss }: ModalProps) {
    const dispatch = useDispatch();

    const fileSelection = useSelector(
        selection.selectors.getFileSelection,
        FileSelection.selectionsAreEqual
    );

    const httpFileService = useSelector(interaction.selectors.getHttpFileService);

    const [opts, setOpts] = React.useState<UIOpts>({
        sceneIndex: "0",
        channelIndex: "0",
    });

    const [status, setStatus] = React.useState<Status>("idle");
    const [manifestUrl, setManifestUrl] = React.useState<string | null>(null);
    const [computeTaskId, setComputeTaskId] = React.useState<string | null>(null);
    const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

    const [hasNonLocalFiles, setHasNonLocalFiles] = React.useState(false);

    // Determine whether all selected files are local
    React.useEffect(() => {
        let cancelled = false;

        (async () => {
            const details = await fileSelection.fetchAllDetails();
            if (cancelled) return;

            const hasAnyNonLocal = details.some((d) => {
                const shouldBeInLocal = d.getFirstAnnotationValue(
                    AnnotationName.SHOULD_BE_IN_LOCAL
                );

                const localPath = d.getFirstAnnotationValue(AnnotationName.LOCAL_FILE_PATH);

                return !shouldBeInLocal || typeof localPath !== "string";
            });

            setHasNonLocalFiles(hasAnyNonLocal);
        })();

        return () => {
            cancelled = true;
        };
    }, [fileSelection]);

    // Clipboard copy
    const copyManifestUrl = async () => {
        if (!manifestUrl) return;

        try {
            await navigator.clipboard.writeText(manifestUrl);
            dispatch(
                interaction.actions.processSuccess(
                    "acmCopySuccess",
                    "Manifest CSV path copied to clipboard."
                )
            );
        } catch {
            dispatch(
                interaction.actions.processError(
                    "acmCopyError",
                    "Failed to copy manifest CSV path."
                )
            );
        }
    };

    // Submit ACM job
    const onSubmit = async () => {
        if (status !== "idle" || hasNonLocalFiles) return;

        setStatus("submitting");
        setStatusMessage(null);

        try {
            const details = await fileSelection.fetchAllDetails();
            if (!details.length) {
                throw new Error("No files selected.");
            }

            const files: string[] = details.map((d) => {
                // TODO: ideally switch to file IDs instead of local paths
                const localPath = d.getFirstAnnotationValue(AnnotationName.LOCAL_FILE_PATH);

                if (typeof localPath !== "string" || localPath.length === 0) {
                    throw new Error(
                        "One or more selected files do not have a valid local file path."
                    );
                }

                return localPath;
            });

            const scene =
                opts.sceneIndex.trim() && /^\d+$/.test(opts.sceneIndex)
                    ? parseInt(opts.sceneIndex, 10)
                    : 0;

            const channel =
                opts.channelIndex.trim() && /^\d+$/.test(opts.channelIndex)
                    ? parseInt(opts.channelIndex, 10)
                    : 0;

            const { computeTaskId, manifestCsvPath } = await httpFileService.submitAllCellsMaskJob({
                files,
                scene,
                channel,
            });

            setComputeTaskId(computeTaskId);
            setManifestUrl(manifestCsvPath);
            setStatus("waiting-for-manifest");

            dispatch(
                interaction.actions.processSuccess(
                    "acmJobSubmitted",
                    "All Cells Mask job submitted. Processing has started."
                )
            );

            await httpFileService.waitForPath(manifestCsvPath);

            setStatus("ready");

            dispatch(
                interaction.actions.processSuccess(
                    "acmManifestReady",
                    "Manifest CSV is now available."
                )
            );
        } catch (err) {
            console.error(err);
            setStatus("error");
            setStatusMessage(
                "An error occurred while submitting or waiting for the All Cells Mask job."
            );

            dispatch(
                interaction.actions.processError(
                    "acmSubmitError",
                    "Failed to submit All Cells Mask job."
                )
            );
        }
    };

    // Open results in BFF (Query)
    const onOpenResults = () => {
        if (!manifestUrl) return;

        const shortId = computeTaskId ? computeTaskId.slice(-6) : "unknown";

        dispatch(
            selection.actions.addQuery({
                name: `All Cells Mask Results (${shortId})`,
                parts: {
                    sources: [
                        {
                            name: `ALL-CELLS-MASK-${shortId}`,
                            type: "csv",
                            uri: manifestUrl,
                        },
                    ],
                },
                loading: true,
            })
        );

        onDismiss();
    };

    const submitDisabled = status !== "idle" || hasNonLocalFiles;

    const submitTooltip = hasNonLocalFiles
        ? "All selected files must be available locally before submitting this job."
        : "This job has already been submitted. Please wait for the manifest CSV.";

    // BODY
    const body = (
        <div className={styles.shell}>
            <div className={styles.columns}>
                {/* LEFT COLUMN */}
                <div className={styles.leftCol}>
                    <div className={styles.section}>
                        <div className={styles.label}>Scene</div>
                        <div className={styles.searchBox}>
                            <TextField
                                value={opts.sceneIndex}
                                type="number"
                                onChange={(_, v) =>
                                    setOpts((o) => ({
                                        ...o,
                                        sceneIndex: (v ?? "0").replace(/[^\d]/g, ""),
                                    }))
                                }
                                placeholder="0"
                                borderless
                            />
                        </div>
                    </div>

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

                {/* RIGHT COLUMN */}
                <div className={styles.rightCol}>
                    {status === "idle" && (
                        <>
                            <h4>About this workflow</h4>
                            <p className={styles.text}>
                                The All Cells Mask workflow generates segmentation masks for the
                                selected files and produces a manifest CSV that is updated as
                                processing runs.
                            </p>
                        </>
                    )}

                    {manifestUrl && (
                        <div className={styles.manifestBox}>
                            <h4>Manifest CSV location</h4>
                            <code className={styles.code}>{manifestUrl}</code>
                            <SecondaryButton onClick={copyManifestUrl} text="COPY PATH" />
                        </div>
                    )}

                    {status === "error" && (
                        <div className={styles.errorBox}>
                            <div className={styles.errorTitle}>Submission failed</div>
                            <div className={styles.errorText}>{statusMessage}</div>
                        </div>
                    )}
                </div>
            </div>

            {status === "waiting-for-manifest" && (
                <div className={styles.fullWidthWaiting}>
                    <LoadingIcon className={styles.statusSpinner} />
                    Preparing manifest CSV…
                </div>
            )}

            {status === "ready" && (
                <div className={styles.fullWidthSuccess}>
                    <Icon iconName="CheckMark" />
                    Manifest CSV available
                </div>
            )}
        </div>
    );

    // FOOTER
    const footer = (
        <div className={styles.footerButtons}>
            <SecondaryButton onClick={onDismiss} text="CANCEL" />

            {status === "ready" ? (
                <PrimaryButton onClick={onOpenResults} text="OPEN RESULTS IN BFF" />
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
