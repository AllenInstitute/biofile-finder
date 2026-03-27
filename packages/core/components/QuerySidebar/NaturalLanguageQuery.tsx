import classNames from "classnames";
import * as React from "react";
import { batch, useDispatch, useSelector } from "react-redux";

import { TertiaryButton } from "../Buttons";
import LoadingIcon from "../Icons/LoadingIcon";
import NaturalLanguageDisambiguationModal from "./NaturalLanguageDisambiguationModal";
import { TOP_LEVEL_FILE_ANNOTATION_NAMES } from "../../constants";
import { parseNaturalLanguageQuery } from "./naturalLanguage";
import { AnnotationValue } from "../../services/AnnotationService";
import { interaction, metadata, selection } from "../../state";

import styles from "./NaturalLanguageQuery.module.css";

interface Props {
    disabled?: boolean;
}

export default function NaturalLanguageQuery(props: Props) {
    const dispatch = useDispatch();
    const annotations = useSelector(metadata.selectors.getSortedAnnotations);
    const annotationService = useSelector(interaction.selectors.getAnnotationService);
    const availableAnnotationNames = useSelector(
        selection.selectors.getAvailableAnnotationsForHierarchy
    );

    const [status, setStatus] = React.useState("");
    const [isError, setIsError] = React.useState(false);
    const [isBusy, setIsBusy] = React.useState(false);
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const [isLoadingValues, setIsLoadingValues] = React.useState(false);
    const [lastSubmittedQuery, setLastSubmittedQuery] = React.useState("");
    const [queryText, setQueryText] = React.useState("");
    const [annotationValuesByName, setAnnotationValuesByName] = React.useState<
        Record<string, AnnotationValue[]>
    >({});
    const [resolvedAnnotationsByPhrase, setResolvedAnnotationsByPhrase] = React.useState<
        Record<string, string>
    >({});
    const [pendingAmbiguity, setPendingAmbiguity] = React.useState<
        ReturnType<typeof parseNaturalLanguageQuery>["ambiguities"][number] | undefined
    >();
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const loadAnnotationValues = React.useCallback(async () => {
        const annotationsToLoad = annotations.filter(
            (annotation) => !TOP_LEVEL_FILE_ANNOTATION_NAMES.includes(annotation.name)
        );
        if (!annotationsToLoad.length) {
            return {};
        }

        setIsLoadingValues(true);
        try {
            const responses = await Promise.allSettled(
                annotationsToLoad.map(async (annotation) => ({
                    annotationName: annotation.name,
                    values: await annotationService.fetchValues(annotation.name),
                }))
            );

            const nextValues = responses.reduce(
                (map, response) =>
                    response.status === "fulfilled"
                        ? {
                              ...map,
                              [response.value.annotationName]: response.value.values,
                          }
                        : map,
                {} as Record<string, AnnotationValue[]>
            );
            setAnnotationValuesByName(nextValues);
            return nextValues;
        } finally {
            setIsLoadingValues(false);
        }
    }, [annotationService, annotations]);

    React.useEffect(() => {
        setAnnotationValuesByName({});
        setResolvedAnnotationsByPhrase({});
        setPendingAmbiguity(undefined);
        setQueryText("");
        setStatus("");
        setIsError(false);
        setIsBusy(false);
        setIsCollapsed(false);
        setIsLoadingValues(false);
    }, [annotations, props.disabled]);

    const describeAnnotation = React.useCallback(
        (annotationName: string) =>
            annotations.find((annotation) => annotation.name === annotationName)?.displayName ||
            annotationName,
        [annotations]
    );

    const summarizeResult = React.useCallback(
        (nextFiltersCount: number, hierarchy: string[], sortAnnotationName?: string) => {
            const parts: string[] = [];
            parts.push(
                nextFiltersCount
                    ? `updated ${nextFiltersCount} filter${nextFiltersCount > 1 ? "s" : ""}`
                    : "cleared filters"
            );
            parts.push(
                hierarchy.length
                    ? `grouped by ${hierarchy.map(describeAnnotation).join(", ")}`
                    : "cleared grouping"
            );
            parts.push(
                sortAnnotationName
                    ? `sorted by ${describeAnnotation(sortAnnotationName)}`
                    : "cleared sort"
            );
            return parts.join(", ");
        },
        [describeAnnotation]
    );

    const previewParse = React.useMemo(
        () =>
            parseNaturalLanguageQuery(queryText, {
                annotations,
                annotationValuesByName,
                availableAnnotationNames,
                resolvedAnnotationsByPhrase,
            }),
        [
            annotationValuesByName,
            annotations,
            availableAnnotationNames,
            queryText,
            resolvedAnnotationsByPhrase,
        ]
    );

    const highlightedMarkup = React.useMemo(() => {
        const palette = ["var(--aqua)", "#f7b267", "#7bd389", "#f4845f", "#8ecae6", "#ff99c8"];
        const annotationColorMap = new Map<string, string>();
        previewParse.recognizedAnnotations.forEach((recognized) => {
            if (!annotationColorMap.has(recognized.annotationName)) {
                annotationColorMap.set(
                    recognized.annotationName,
                    palette[annotationColorMap.size % palette.length]
                );
            }
        });

        const matches = previewParse.recognizedAnnotations
            .flatMap((recognized) => {
                const regex = new RegExp(
                    recognized.phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                    "ig"
                );
                return Array.from(queryText.matchAll(regex)).map((match) => ({
                    annotationName: recognized.annotationName,
                    end: (match.index || 0) + match[0].length,
                    start: match.index || 0,
                    text: match[0],
                }));
            })
            .sort((left, right) => left.start - right.start || right.end - left.end);

        const nonOverlappingMatches = matches.reduce<typeof matches>((acc, match) => {
            const overlapsExisting = acc.some(
                (existing) => match.start < existing.end && match.end > existing.start
            );
            return overlapsExisting ? acc : [...acc, match];
        }, []);

        let currentIndex = 0;
        const parts: React.ReactNode[] = [];
        nonOverlappingMatches.forEach((match, index) => {
            if (match.start > currentIndex) {
                parts.push(
                    <span key={`plain-${currentIndex}`}>
                        {queryText.slice(currentIndex, match.start)}
                    </span>
                );
            }
            parts.push(
                <span
                    key={`match-${match.start}-${index}`}
                    style={{ color: annotationColorMap.get(match.annotationName) }}
                >
                    {match.text}
                </span>
            );
            currentIndex = match.end;
        });

        if (currentIndex < queryText.length) {
            parts.push(<span key="plain-tail">{queryText.slice(currentIndex)}</span>);
        }

        return parts.length ? parts : [<span key="plain-empty">{queryText}</span>];
    }, [previewParse.recognizedAnnotations, queryText]);

    React.useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) {
            return;
        }

        textarea.style.height = "auto";
        const maxHeight = isCollapsed ? 44 : 220;
        textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    }, [isCollapsed, queryText]);

    const onApply = React.useCallback(
        async (
            input: string,
            phraseOverrides: Record<string, string> = resolvedAnnotationsByPhrase
        ) => {
            if (props.disabled) {
                return;
            }
            const trimmed = input.trim();
            if (!trimmed) {
                setStatus("");
                setIsError(false);
                setPendingAmbiguity(undefined);
                return;
            }

            setIsBusy(true);
            setStatus("Thinking...");
            setIsError(false);
            try {
                const valueMap =
                    Object.keys(annotationValuesByName).length > 0
                        ? annotationValuesByName
                        : await loadAnnotationValues();
                const parsed = parseNaturalLanguageQuery(trimmed, {
                    annotations,
                    annotationValuesByName: valueMap,
                    availableAnnotationNames,
                    resolvedAnnotationsByPhrase: phraseOverrides,
                });

                if (parsed.ambiguities.length) {
                    setLastSubmittedQuery(trimmed);
                    setPendingAmbiguity(parsed.ambiguities[0]);
                    setIsError(false);
                    setStatus("");
                    return;
                }

                if (!parsed.touchedFilters && !parsed.touchedHierarchy && !parsed.touchedSort) {
                    setIsError(true);
                    setStatus("No grouping, filter, or sort instructions were recognized.");
                    return;
                }

                setLastSubmittedQuery(trimmed);
                setPendingAmbiguity(undefined);
                batch(() => {
                    dispatch(selection.actions.setFileFilters(parsed.filters));
                    dispatch(selection.actions.setAnnotationHierarchy(parsed.hierarchy));
                    dispatch(selection.actions.setSortColumn(parsed.sortColumn));
                });

                setIsError(false);
                setStatus(
                    summarizeResult(
                        parsed.filters.length,
                        parsed.hierarchy,
                        parsed.sortColumn?.annotationName
                    )
                );
            } finally {
                setIsBusy(false);
            }
        },
        [
            annotationValuesByName,
            annotations,
            availableAnnotationNames,
            dispatch,
            loadAnnotationValues,
            props.disabled,
            resolvedAnnotationsByPhrase,
            summarizeResult,
        ]
    );

    if (props.disabled) {
        return null;
    }

    const isWorking = isBusy || isLoadingValues;

    return (
        <div className={styles.container}>
            <div className={styles.headerRow}>
                {!isCollapsed && (
                    <p className={styles.description}>
                        Describe filters, grouping, or sorting in plain language. Shared annotation
                        values are recognized automatically.
                    </p>
                )}
                {isWorking && (
                    <div className={styles.busyIndicator}>
                        <LoadingIcon className={styles.busySpinner} invertColor />
                        <span>
                            {isLoadingValues ? "Loading annotation values..." : "Thinking..."}
                        </span>
                    </div>
                )}
                <TertiaryButton
                    className={styles.collapseButton}
                    disabled={isBusy}
                    iconName={isCollapsed ? "ChevronDown" : "ChevronUp"}
                    onClick={() => setIsCollapsed((current) => !current)}
                    title={isCollapsed ? "Expand query area" : "Collapse query area"}
                />
            </div>
            <div className={styles.inputRow}>
                <div className={classNames(styles.input, { [styles.collapsedInput]: isCollapsed })}>
                    <div aria-hidden className={styles.highlightLayer}>
                        {highlightedMarkup}
                        {"\n"}
                    </div>
                    <textarea
                        ref={textareaRef}
                        className={classNames(styles.multilineInput, {
                            [styles.collapsedTextarea]: isCollapsed,
                        })}
                        onChange={(event) => {
                            setQueryText(event.target.value || "");
                        }}
                        onKeyDown={(event) => {
                            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                                event.preventDefault();
                                void onApply(queryText);
                            }
                        }}
                        placeholder={
                            isLoadingValues
                                ? "Loading shared annotation values..."
                                : "Example: group by cell line, donor plasmid and donor plasmid ACTB-mEGFP"
                        }
                        rows={isCollapsed ? 1 : 2}
                        value={queryText}
                    />
                </div>
            </div>
            {!isCollapsed && (
                <>
                    <div className={styles.buttonRow}>
                        <TertiaryButton
                            className={styles.submitButton}
                            disabled={isBusy}
                            title={isBusy ? "Working" : "Submit"}
                            onClick={() => void onApply(queryText)}
                            iconName={isBusy ? "Sync" : "ReturnKey"}
                        />
                        <TertiaryButton
                            className={styles.clearButton}
                            disabled={isBusy}
                            title="Clear"
                            onClick={() => {
                                setQueryText("");
                                setPendingAmbiguity(undefined);
                                setResolvedAnnotationsByPhrase({});
                                setStatus("");
                                setIsError(false);
                            }}
                            iconName="Clear"
                        />
                    </div>
                    <p className={styles.shortcutHint}>
                        Press `Ctrl+Enter` or `Cmd+Enter` to submit a multi-line query.
                    </p>
                </>
            )}
            {!!status && (!isCollapsed || isError) && (
                <p className={classNames(styles.status, { [styles.error]: isError })}>{status}</p>
            )}
            {pendingAmbiguity && (
                <NaturalLanguageDisambiguationModal
                    matches={pendingAmbiguity.matches}
                    phrase={pendingAmbiguity.phrase}
                    onCancel={() => setPendingAmbiguity(undefined)}
                    onSelect={(annotation) => {
                        const nextOverrides = {
                            ...resolvedAnnotationsByPhrase,
                            [pendingAmbiguity.phrase]: annotation.name,
                        };
                        setResolvedAnnotationsByPhrase(nextOverrides);
                        setPendingAmbiguity(undefined);
                        void onApply(lastSubmittedQuery, nextOverrides);
                    }}
                />
            )}
        </div>
    );
}
