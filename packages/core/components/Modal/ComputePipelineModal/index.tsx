import { Checkbox, IComboBoxOption, Icon, Spinner, TextField } from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import { PrimaryButton, SecondaryButton } from "../../Buttons";
import BaseComboBox from "../../ComboBox";
import FileSelection from "../../../entity/FileSelection";
import { Pipeline, PipelineParameter } from "../../../entity/ComputePipeline";

import { interaction, selection } from "../../../state";
import AnnotationName from "../../../entity/Annotation/AnnotationName";

import styles from "./ComputePipelineModal.module.css";

type ModalPhase = "loading" | "selecting" | "configuring" | "submitting" | "submitted" | "error";

// ---- Helper: default value for an optional param when first added ----
function getInitialValue(param: PipelineParameter): unknown {
    if (param.default !== null && param.default !== undefined) return param.default;
    switch (param.type) {
        case "number":
            return "";
        case "boolean":
            return false;
        case "select":
            return "";
        default:
            return "";
    }
}

// ---- Helper: validate a single param value ----
function validateParam(param: PipelineParameter, value: unknown): string {
    const empty = value === null || value === undefined || value === "";
    if (param.required && empty) return "This field is required.";
    if (empty) return "";

    const { validation, type } = param;
    if (type === "number") {
        const n = Number(value);
        if (isNaN(n)) return "Must be a number.";
        if (validation.min !== undefined && n < validation.min)
            return `Must be at least ${validation.min}.`;
        if (validation.max !== undefined && n > validation.max)
            return `Must be no more than ${validation.max}.`;
    }
    if (type === "string" && validation.pattern) {
        if (!new RegExp(validation.pattern).test(String(value))) {
            // Friendly message for the common /allen/ pattern
            if (validation.pattern === "^/allen/.*") return "Must start with /allen/";
            return `Invalid format`;
        }
    }
    return "";
}

// ---- Sub-component: single parameter input ----
interface ParamInputProps {
    param: PipelineParameter;
    value: unknown;
    error: string;
    onChange: (value: unknown) => void;
    onBlur: () => void;
}

function PipelineParameterInput({ param, value, error, onChange, onBlur }: ParamInputProps) {
    if (param.type === "boolean") {
        return (
            <div className={styles.paramField}>
                <div className={styles.paramLabel}>{param.label}</div>
                <div className={styles.paramDesc}>{param.description}</div>
                <Checkbox
                    className={styles.checkbox}
                    label={!!value ? "On" : "Off"}
                    checked={!!value}
                    onChange={(_, checked) => onChange(!!checked)}
                />
                {error && <div className={styles.paramError}>{error}</div>}
            </div>
        );
    }

    if (param.type === "select") {
        const options: IComboBoxOption[] = (param.options ?? []).map((o) => ({
            key: o,
            text: o,
        }));
        return (
            <div className={styles.paramField}>
                <BaseComboBox
                    label={`${param.label}${param.required ? " *" : ""}`}
                    options={options}
                    selectedKey={(value as string) ?? undefined}
                    onChange={(opt) => opt && onChange(opt.key as string)}
                    placeholder="Select an option"
                />
                <div className={styles.paramDesc}>{param.description}</div>
                {error && <div className={styles.paramError}>{error}</div>}
            </div>
        );
    }

    return (
        <div className={styles.paramField}>
            <div className={styles.paramLabel}>
                {param.label}
                {param.required && " *"}
            </div>
            <div className={styles.paramDesc}>{param.description}</div>
            <TextField
                className={styles.inputBox}
                type={param.type === "number" ? "number" : "text"}
                value={value !== null && value !== undefined ? String(value) : ""}
                onChange={(_, v) => onChange(param.type === "number" ? v ?? "" : v ?? "")}
                onBlur={onBlur}
                placeholder={
                    param.default !== null && param.default !== undefined
                        ? String(param.default)
                        : ""
                }
                borderless
            />
            {error && <div className={styles.paramError}>{error}</div>}
        </div>
    );
}

// ---- Sub-component: collapsible selected files ----
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

    const shown = paths ?? [];

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
                        {shown.map((p) => (
                            <li key={p} className={styles.filePathItem}>
                                <Icon iconName="TextDocument" />
                                {p}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

// ---- Sub-component: right-side info card ----
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

// ---- Main modal ----

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
                    if (p.required && p.type !== "file_paths" && p.default !== null) {
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

    const requiredParams = parameters.filter((p) => p.required && p.type !== "file_paths");
    const optionalParams = parameters.filter((p) => !p.required && p.type !== "file_paths");
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
        if (Object.values(errors).some(Boolean)) {
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
                user: null,
                parameters: {
                    file_paths: filePaths,
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
    const submitDisabled = phase !== "configuring" || fileCount === 0;

    // ---- RENDER ----

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

        if (phase === "submitted" && selectedPipeline) {
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

        if (!selectedPipeline) return null;

        // ---- Full configuring/submitting/error form ----
        return (
            <div className={styles.formShell}>
                {phase === "error" && (
                    <div className={styles.errorBanner}>
                        <strong>Submission failed</strong>
                        <p>{errorMessage}</p>
                    </div>
                )}

                <div className={styles.columns}>
                    {/* FORM FIELDS */}
                    <div className={styles.leftCol}>
                        {/* Selected files */}
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

                        {/* Run location */}
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

                        {/* Required params */}
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

                        {/* Advanced options */}
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

                    {/* INFO CARD */}
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
