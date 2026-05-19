import { IComboBoxOption, Icon, Spinner, TextField } from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import { PrimaryButton, SecondaryButton } from "../../Buttons";
import BaseComboBox from "../../ComboBox";
import AnnotationName from "../../../entity/Annotation/AnnotationName";
import { Pipeline, PipelineParameter } from "../../../entity/ComputePipeline";
import FileSelection from "../../../entity/FileSelection";
import { interaction, selection } from "../../../state";

import styles from "./ComputePipelineModal.module.css";

const FILE_PATHS_PARAM = "file_paths";
const MAX_VISIBLE_FILE_PATHS = 10;

type ModalPhase = "loading" | "selecting" | "configuring" | "submitting" | "submitted" | "error";

function getInitialValue(param: PipelineParameter): string {
    return param.default !== null && param.default !== undefined ? String(param.default) : "";
}

function validateParam(param: PipelineParameter, value: unknown): string {
    const empty = value === null || value === undefined || value === "";
    if (param.required && empty) return "This field is required.";
    if (empty) return "";

    const { validation } = param;
    const n = Number(value);
    if (isNaN(n)) return "Must be a number.";
    if (validation.min !== undefined && n < validation.min)
        return `Must be at least ${validation.min}.`;
    if (validation.max !== undefined && n > validation.max)
        return `Must be no more than ${validation.max}.`;
    return "";
}

interface ParamInputProps {
    param: PipelineParameter;
    value: unknown;
    error: string;
    onChange: (value: unknown) => void;
    onBlur: () => void;
}

function PipelineParameterInput({ param, value, error, onChange, onBlur }: ParamInputProps) {
    return (
        <div className={styles.paramField}>
            <div className={styles.paramLabel}>
                {param.label}
                {param.required && " *"}
            </div>
            <div className={styles.paramDesc}>{param.description}</div>
            <TextField
                type="number"
                value={value !== null && value !== undefined ? String(value) : ""}
                onChange={(_, v) => onChange(v ?? "")}
                onBlur={onBlur}
                placeholder={param.default !== null ? String(param.default) : ""}
                borderless
                styles={{
                    field: {
                        backgroundColor: "var(--secondary-background-color)",
                        color: "var(--secondary-text-color)",
                    },
                }}
            />
            {error && <div className={styles.paramError}>{error}</div>}
        </div>
    );
}

interface SelectedFilesExpanderProps {
    count: number;
    onExpand: () => Promise<string[]>;
}

function SelectedFilesExpander({ count, onExpand }: SelectedFilesExpanderProps) {
    const [expanded, setExpanded] = React.useState(false);
    const [paths, setPaths] = React.useState<string[] | null>(null);
    const [loading, setLoading] = React.useState(false);

    const toggle = async () => {
        if (!expanded && paths === null) {
            setLoading(true);
            const fetched = await onExpand();
            setPaths(fetched);
            setLoading(false);
        }
        setExpanded((e) => !e);
    };

    return (
        <div className={styles.expander}>
            <div className={styles.expanderHeader} onClick={toggle}>
                <span className={styles.expanderHeaderLeft}>
                    <Icon iconName="FolderOpen" />
                    {count} selected file{count !== 1 ? "s" : ""}
                </span>
                {loading ? <Spinner /> : <Icon iconName={expanded ? "ChevronUp" : "ChevronDown"} />}
            </div>
            {expanded && paths !== null && (
                <div className={styles.expanderBody}>
                    <div className={styles.expanderNote}>
                        Files are added automatically from your current selection.
                    </div>
                    <ul className={styles.filePathList}>
                        {paths.slice(0, MAX_VISIBLE_FILE_PATHS).map((p) => (
                            <li key={p} className={styles.filePathItem}>
                                <Icon iconName="TextDocument" />
                                {p}
                            </li>
                        ))}
                    </ul>
                    {paths.length > MAX_VISIBLE_FILE_PATHS && (
                        <div className={styles.expanderNote}>
                            …and {paths.length - MAX_VISIBLE_FILE_PATHS} more
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

interface PipelineInfoCardProps {
    pipeline: Pipeline;
}

function PipelineInfoCard({ pipeline }: PipelineInfoCardProps) {
    return (
        <div className={styles.infoCard}>
            <div className={styles.infoCardDesc}>{pipeline.description}</div>
            <hr className={styles.infoCardDivider} />
            <div className={styles.infoTable}>
                <div className={styles.infoRow}>
                    <span className={styles.infoRowLabel}>Accepted formats</span>
                    <span className={styles.infoRowValue}>
                        {pipeline.acceptedExtensions.map((e) => e.toUpperCase()).join(", ")}
                    </span>
                </div>
                <div className={styles.infoRow}>
                    <span className={styles.infoRowLabel}>Run locations</span>
                    <span className={styles.infoRowValue}>{pipeline.clusters.join(", ")}</span>
                </div>
                <div className={styles.infoRow}>
                    <span className={styles.infoRowLabel}>Restrictions</span>
                    <span className={styles.infoRowValue}>{pipeline.restrictions ?? "None"}</span>
                </div>
            </div>
        </div>
    );
}

export default function ComputePipelineModal({ onDismiss }: ModalProps) {
    const dispatch = useDispatch();

    const fileSelection = useSelector(
        selection.selectors.getFileSelection,
        FileSelection.selectionsAreEqual
    );
    const pipelineService = useSelector(interaction.selectors.getPipelineService);
    const selectedPipelineId = useSelector(interaction.selectors.getSelectedPipelineId);

    // Phase state
    const [phase, setPhase] = React.useState<ModalPhase>("loading");
    const [pipelines, setPipelines] = React.useState<Pipeline[]>([]);
    const [selectedPipeline, setSelectedPipeline] = React.useState<Pipeline | null>(null);
    const [selectedCluster, setSelectedCluster] = React.useState<string | null>(null);
    const [parameters, setParameters] = React.useState<PipelineParameter[]>([]);

    // File state (count only — paths are fetched at submit time)
    const fileCount = fileSelection.count();

    // Form state
    const [requiredValues, setRequiredValues] = React.useState<Record<string, unknown>>({});
    const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

    // Optional params: add-one-at-a-time
    const [addedOptionalNames, setAddedOptionalNames] = React.useState<string[]>([]);
    const [optionalValues, setOptionalValues] = React.useState<Record<string, unknown>>({});
    const [optionalSelectorKey, setOptionalSelectorKey] = React.useState<string | null>(null);
    const [advancedExpanded, setAdvancedExpanded] = React.useState(false);

    // User field
    const [userId, setUserId] = React.useState<string>("");
    const [userIdError, setUserIdError] = React.useState<string>("");

    // Submission state
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
    const [computeTaskId, setComputeTaskId] = React.useState<string | null>(null);
    const [dashboardUrl, setDashboardUrl] = React.useState<string | null>(null);

    // Load pipelines on mount; auto-select if a pipeline ID was passed via context menu
    React.useEffect(() => {
        let cancelled = false;
        pipelineService
            .getPipelines()
            .then((result) => {
                if (cancelled) return;
                setPipelines(result);
                if (selectedPipelineId) {
                    const preselected = result.find((p) => p.id === selectedPipelineId);
                    if (preselected) {
                        onSelectPipeline(preselected);
                        return;
                    }
                }
                setPhase("selecting");
            })
            .catch(() => {
                if (!cancelled) {
                    setErrorMessage("Failed to load available pipelines.");
                    setPhase("error");
                }
            });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pipelineService, selectedPipelineId]);

    // When pipeline selected: set default cluster and load params
    const onSelectPipeline = React.useCallback(
        async (pipeline: Pipeline) => {
            setSelectedPipeline(pipeline);
            const defaultCluster = pipeline.clusters[0] ?? null;
            setSelectedCluster(defaultCluster);

            setPhase("loading");

            try {
                const params = await pipelineService.getParameters(
                    pipeline.id,
                    defaultCluster ?? ""
                );

                setParameters(params);
                const defaults: Record<string, unknown> = {};
                for (const p of params) {
                    if (p.required && p.type !== FILE_PATHS_PARAM && p.default !== null) {
                        defaults[p.name] = p.default;
                    }
                }
                setRequiredValues(defaults);
                setAddedOptionalNames([]);
                setOptionalValues({});
                setOptionalSelectorKey(null);
                setFieldErrors({});
                setPhase("configuring");
            } catch {
                setErrorMessage("Failed to load pipeline parameters.");
                setPhase("error");
            }
        },
        [pipelineService]
    );

    // Re-fetch params when cluster changes
    const onClusterChange = React.useCallback(
        async (option?: IComboBoxOption) => {
            if (!option || !selectedPipeline) return;
            const cluster = option.key as string;
            setSelectedCluster(cluster);

            setPhase("loading");

            try {
                const params = await pipelineService.getParameters(selectedPipeline.id, cluster);
                setParameters(params);
                setAddedOptionalNames([]);
                setOptionalValues({});
                setOptionalSelectorKey(null);
                setFieldErrors({});
                setPhase("configuring");
            } catch {
                setErrorMessage("Failed to load pipeline parameters.");
                setPhase("error");
            }
        },
        [pipelineService, selectedPipeline]
    );

    const requiredParams = parameters.filter((p) => p.required && p.type !== FILE_PATHS_PARAM);
    const optionalParams = parameters.filter((p) => !p.required && p.type !== FILE_PATHS_PARAM);
    const remainingOptionalParams = optionalParams.filter(
        (p) => !addedOptionalNames.includes(p.name)
    );
    const addedOptionalParams = optionalParams.filter((p) => addedOptionalNames.includes(p.name));

    const addOptionalParam = () => {
        if (!optionalSelectorKey) return;
        const param = optionalParams.find((p) => p.name === optionalSelectorKey);
        if (!param) return;
        setAddedOptionalNames((prev) => [...prev, param.name]);
        setOptionalValues((prev) => ({ ...prev, [param.name]: getInitialValue(param) }));
        setOptionalSelectorKey(null);
    };

    const removeOptionalParam = (name: string) => {
        setAddedOptionalNames((prev) => prev.filter((n) => n !== name));
        setOptionalValues((prev) => {
            const next = { ...prev };
            delete next[name];
            return next;
        });
        setFieldErrors((prev) => {
            const next = { ...prev };
            delete next[name];
            return next;
        });
    };

    const onRequiredChange = (name: string, value: unknown) => {
        setRequiredValues((prev) => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const onOptionalChange = (name: string, value: unknown) => {
        setOptionalValues((prev) => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const onBlur = (param: PipelineParameter, value: unknown) => {
        const err = validateParam(param, value);
        setFieldErrors((prev) => ({ ...prev, [param.name]: err }));
    };

    const onSubmit = async () => {
        if (!selectedPipeline || !selectedCluster) return;

        // Validate required params
        const errors: Record<string, string> = {};
        for (const p of requiredParams) {
            const err = validateParam(p, requiredValues[p.name]);
            if (err) errors[p.name] = err;
        }
        for (const name of addedOptionalNames) {
            const p = optionalParams.find((op) => op.name === name);
            if (!p) continue;
            const err = validateParam(p, optionalValues[name]);
            if (err) errors[name] = err;
        }
        const userErr = userId.trim() === "" ? "This field is required." : "";
        if (userErr) setUserIdError(userErr);
        if (Object.values(errors).some(Boolean) || userErr) {
            setFieldErrors(errors);
            return;
        }

        setPhase("submitting");
        setErrorMessage(null);

        const addedOptVals: Record<string, unknown> = {};
        for (const name of addedOptionalNames) {
            addedOptVals[name] = optionalValues[name];
        }

        try {
            const details = await fileSelection.fetchAllDetails();
            const filePaths = details
                .map((d) => d.getFirstAnnotationValue(AnnotationName.LOCAL_FILE_PATH))
                .filter((p): p is string => typeof p === "string");

            const result = await pipelineService.submitComputeTask({
                pipeline: selectedPipeline.id,
                cluster: selectedCluster,
                user: userId || null,
                parameters: {
                    [FILE_PATHS_PARAM]: filePaths,
                    ...requiredValues,
                    ...addedOptVals,
                },
            });

            setComputeTaskId(result.computeTaskId);
            setDashboardUrl(result.dashboardUrl);
            setPhase("submitted");

            dispatch(
                interaction.actions.processSuccess(
                    "pipelineJobSubmitted",
                    `${selectedPipeline.name} job submitted successfully.`
                )
            );
        } catch {
            setErrorMessage("An error occurred while submitting the job.");
            setPhase("error");
            dispatch(
                interaction.actions.processError(
                    "pipelineSubmitError",
                    "Failed to submit pipeline job."
                )
            );
        }
    };

    const isSubmitting = phase === "submitting";
    const submitDisabled = isSubmitting || fileCount === 0;

    const renderBody = () => {
        if (phase === "loading") {
            return (
                <div className={styles.loading}>
                    <Spinner />
                    {selectedPipeline ? "Loading parameters..." : "Loading available pipelines..."}
                </div>
            );
        }

        if (phase === "selecting") {
            return (
                <div className={styles.selectionShell}>
                    {pipelines.map((p) => (
                        <div
                            key={p.id}
                            className={styles.pipelineCard}
                            onClick={() => onSelectPipeline(p)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === "Enter" && onSelectPipeline(p)}
                        >
                            <div className={styles.pipelineCardTitle}>{p.name}</div>
                            <div className={styles.pipelineCardDesc}>{p.description}</div>
                            <div className={styles.pipelineCardMeta}>
                                <span>
                                    Formats:{" "}
                                    {p.acceptedExtensions.map((e) => e.toUpperCase()).join(", ")}
                                </span>
                                <span>Clusters: {p.clusters.join(", ")}</span>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        if (phase === "error" && !selectedPipeline) {
            return (
                <div className={styles.errorBanner}>
                    <strong>Error</strong>
                    <p>{errorMessage}</p>
                </div>
            );
        }

        if (!selectedPipeline) return null;

        if (phase === "submitted") {
            return (
                <div className={styles.successBanner}>
                    <div className={styles.successTitle}>Pipeline submitted</div>
                    {computeTaskId && (
                        <div className={styles.successJobId}>Job ID: {computeTaskId}</div>
                    )}
                    <div className={styles.successHint}>
                        You can monitor progress in the job dashboard.
                    </div>
                </div>
            );
        }

        return (
            <div className={styles.formShell}>
                {phase === "error" && (
                    <div className={styles.errorBanner}>
                        <strong>Submission failed</strong>
                        <p>{errorMessage}</p>
                    </div>
                )}

                <div className={styles.columns}>
                    <div className={styles.leftCol}>
                        <div className={styles.section}>
                            <div className={styles.sectionLabel}>Selected files</div>
                            <SelectedFilesExpander
                                count={fileCount}
                                onExpand={async () => {
                                    const details = await fileSelection.fetchAllDetails();
                                    return details.map((d) => d.name);
                                }}
                            />
                        </div>

                        <div className={styles.section}>
                            <BaseComboBox
                                label="Run Location"
                                options={selectedPipeline.clusters.map((c) => ({
                                    key: c,
                                    text: c,
                                }))}
                                selectedKey={selectedCluster ?? undefined}
                                onChange={onClusterChange}
                                placeholder="Select a cluster"
                            />
                        </div>

                        <div className={styles.paramField}>
                            <div className={styles.paramLabel}>User *</div>
                            <TextField
                                type="text"
                                value={userId}
                                onChange={(_, v) => {
                                    setUserId(v ?? "");
                                    if (userIdError) setUserIdError("");
                                }}
                                placeholder="Enter your user ID (ex. first.last)"
                                borderless
                                styles={{
                                    field: {
                                        backgroundColor: "var(--secondary-background-color)",
                                        color: "var(--secondary-text-color)",
                                    },
                                }}
                            />
                            {userIdError && <div className={styles.paramError}>{userIdError}</div>}
                        </div>

                        {requiredParams.map((p) => (
                            <PipelineParameterInput
                                key={p.name}
                                param={p}
                                value={requiredValues[p.name] ?? ""}
                                error={fieldErrors[p.name] ?? ""}
                                onChange={(v) => onRequiredChange(p.name, v)}
                                onBlur={() => onBlur(p, requiredValues[p.name])}
                            />
                        ))}

                        {optionalParams.length > 0 && (
                            <div className={styles.advancedSection}>
                                <div
                                    className={styles.advancedHeader}
                                    onClick={() => setAdvancedExpanded((e) => !e)}
                                >
                                    <span className={styles.advancedHeaderLeft}>
                                        <Icon
                                            iconName={
                                                advancedExpanded ? "ChevronDown" : "ChevronRight"
                                            }
                                        />
                                        Advanced options ({optionalParams.length})
                                    </span>
                                    <span>
                                        {addedOptionalNames.length > 0 &&
                                            `${addedOptionalNames.length} added`}
                                    </span>
                                </div>

                                {advancedExpanded && (
                                    <div className={styles.advancedBody}>
                                        <div className={styles.advancedHint}>
                                            Add only the optional parameters you want to override.
                                        </div>

                                        {addedOptionalParams.map((p) => (
                                            <div key={p.name} className={styles.optionalRow}>
                                                <PipelineParameterInput
                                                    param={p}
                                                    value={optionalValues[p.name] ?? ""}
                                                    error={fieldErrors[p.name] ?? ""}
                                                    onChange={(v) => onOptionalChange(p.name, v)}
                                                    onBlur={() => onBlur(p, optionalValues[p.name])}
                                                />
                                                <button
                                                    className={styles.removeButton}
                                                    onClick={() => removeOptionalParam(p.name)}
                                                    title="Remove parameter"
                                                >
                                                    <Icon iconName="Delete" />
                                                </button>
                                            </div>
                                        ))}

                                        {remainingOptionalParams.length > 0 && (
                                            <div className={styles.addParamRow}>
                                                <div className={styles.addParamDropdown}>
                                                    <BaseComboBox
                                                        label=""
                                                        options={remainingOptionalParams.map(
                                                            (p) => ({
                                                                key: p.name,
                                                                text: p.label,
                                                            })
                                                        )}
                                                        selectedKey={
                                                            optionalSelectorKey ?? undefined
                                                        }
                                                        onChange={(opt) =>
                                                            opt &&
                                                            setOptionalSelectorKey(
                                                                opt.key as string
                                                            )
                                                        }
                                                        placeholder={`Select optional parameter (${remainingOptionalParams.length} remaining)`}
                                                    />
                                                </div>
                                                <SecondaryButton
                                                    text="+"
                                                    onClick={addOptionalParam}
                                                    disabled={!optionalSelectorKey}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className={styles.rightCol}>
                        <div className={styles.sectionLabel}>About this pipeline</div>
                        <PipelineInfoCard pipeline={selectedPipeline} />
                    </div>
                </div>
            </div>
        );
    };

    const title = selectedPipeline
        ? selectedPipeline.name
        : phase === "selecting"
        ? "Select a Pipeline"
        : "Compute Pipeline";

    const footer = (
        <div className={styles.footerButtons}>
            {phase === "submitted" ? (
                <>
                    <SecondaryButton onClick={onDismiss} text="CLOSE" />
                    {dashboardUrl && (
                        <PrimaryButton
                            onClick={() =>
                                window.open(dashboardUrl, "_blank", "noopener,noreferrer")
                            }
                            text="OPEN DASHBOARD"
                        />
                    )}
                </>
            ) : (
                <>
                    <SecondaryButton onClick={onDismiss} text="CANCEL" />
                    {(phase === "configuring" || isSubmitting || phase === "error") &&
                        selectedPipeline && (
                            <PrimaryButton
                                onClick={onSubmit}
                                text={isSubmitting ? "SUBMITTING..." : "SUBMIT"}
                                disabled={submitDisabled || isSubmitting}
                            />
                        )}
                </>
            )}
        </div>
    );

    return (
        <BaseModal
            className={styles.wideModal}
            title={title}
            body={renderBody()}
            footer={footer}
            isStatic
            onDismiss={onDismiss}
        />
    );
}
