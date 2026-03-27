import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import FileFilter, { FilterType } from "../../entity/FileFilter";
import FileSet from "../../entity/FileSet";
import FileSort, { SortOrder } from "../../entity/FileSort";
import { interaction, metadata, selection } from "../../state";
import { AnnotationValue } from "../../services/AnnotationService";
import { sendChatMessage, shouldFetchValues } from "./ChatService";
import { ChatMessage, LLMResponse } from "./types";

import styles from "./ChatPanel.module.css";

const API_KEY_STORAGE_KEY = "claude-api-key";

export default function ChatPanel() {
    const dispatch = useDispatch();
    const annotations = useSelector(metadata.selectors.getAnnotations);
    const annotationMap = useSelector(metadata.selectors.getAnnotationNameToAnnotationMap);
    const currentFilters = useSelector(selection.selectors.getFileFilters);
    const fileService = useSelector(interaction.selectors.getFileService);
    const annotationService = useSelector(interaction.selectors.getAnnotationService);

    const [isOpen, setIsOpen] = React.useState(false);
    const [annotationValues, setAnnotationValues] = React.useState<
        Record<string, AnnotationValue[]>
    >({});
    const [messages, setMessages] = React.useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const [apiKey, setApiKey] = React.useState(
        () => localStorage.getItem(API_KEY_STORAGE_KEY) || ""
    );
    const [showApiKeyInput, setShowApiKeyInput] = React.useState(false);
    const [apiKeyDraft, setApiKeyDraft] = React.useState("");

    // For undo: store the filters that were in place before the last LLM action
    const [previousFilters, setPreviousFilters] = React.useState<FileFilter[] | null>(null);
    const [previousSort, setPreviousSort] = React.useState<FileSort | undefined>(undefined);

    const messagesEndRef = React.useRef<HTMLDivElement>(null);
    const sortColumn = useSelector(selection.selectors.getSortColumn);

    // Fetch known values for text/dropdown annotations
    React.useEffect(() => {
        if (!annotations.length || !annotationService) return;
        let cancelled = false;
        const toFetch = annotations.filter(shouldFetchValues);
        Promise.all(
            toFetch.map((a) =>
                annotationService
                    .fetchValues(a.name)
                    .then((values) => ({ name: a.name, values }))
                    .catch(() => ({ name: a.name, values: [] as AnnotationValue[] }))
            )
        ).then((results) => {
            if (cancelled) return;
            const valuesMap: Record<string, AnnotationValue[]> = {};
            for (const r of results) {
                if (r.values.length > 0) {
                    valuesMap[r.name] = r.values;
                }
            }
            setAnnotationValues(valuesMap);
        });
        return () => {
            cancelled = true;
        };
    }, [annotations, annotationService]);

    // Auto-scroll to bottom when messages change
    React.useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const needsApiKey = !apiKey;

    function handleSaveApiKey() {
        const trimmed = apiKeyDraft.trim();
        if (trimmed) {
            localStorage.setItem(API_KEY_STORAGE_KEY, trimmed);
            setApiKey(trimmed);
            setShowApiKeyInput(false);
            setApiKeyDraft("");
        }
    }

    function applyLLMResponse(response: LLMResponse) {
        // Snapshot current state for undo
        setPreviousFilters([...currentFilters]);
        setPreviousSort(sortColumn);

        const appliedFilters: FileFilter[] = [];

        // Remove filters if requested
        if (response.removeFilters?.length) {
            const toRemove = currentFilters.filter((f) =>
                (response.removeFilters || []).some((rf) => rf.annotationName === f.name)
            );
            if (toRemove.length) {
                dispatch(selection.actions.removeFileFilter(toRemove));
            }
        }

        // Add new filters
        if (response.filters?.length) {
            const newFilters = response.filters.map((f) => {
                const filter = new FileFilter(
                    f.annotationName,
                    f.annotationValue,
                    f.filterType as FilterType
                );
                appliedFilters.push(filter);
                return filter;
            });
            dispatch(selection.actions.addFileFilter(newFilters));
        }

        // Set sort
        if (response.sort) {
            const sort = new FileSort(
                response.sort.annotationName,
                response.sort.order as SortOrder
            );
            dispatch(selection.actions.setSortColumn(sort));
        }

        return appliedFilters;
    }

    function getFilterDisplayName(filter: FileFilter): string {
        const annotation = annotationMap[filter.name];
        const name = annotation ? annotation.displayName : filter.name;
        if (filter.type === FilterType.ANY) return `${name}: any value`;
        if (filter.type === FilterType.EXCLUDE) return `${name}: no value`;
        if (filter.type === FilterType.FUZZY) return `${name} ~ "${filter.value}"`;
        return `${name} = "${filter.value}"`;
    }

    function handleClearAll() {
        if (currentFilters.length) {
            setPreviousFilters([...currentFilters]);
            setPreviousSort(sortColumn);
            dispatch(selection.actions.removeFileFilter(currentFilters));
        }
    }

    function handleRemoveFilter(filter: FileFilter) {
        dispatch(selection.actions.removeFileFilter(filter));
    }

    function handleUndo() {
        if (previousFilters !== null) {
            // Remove all current filters and re-add previous ones
            if (currentFilters.length) {
                dispatch(selection.actions.removeFileFilter(currentFilters));
            }
            if (previousFilters.length) {
                dispatch(selection.actions.addFileFilter(previousFilters));
            }
            if (previousSort !== undefined) {
                dispatch(selection.actions.setSortColumn(previousSort));
            }
            setPreviousFilters(null);
        }
    }

    async function fetchFileCount(filters: FileFilter[]): Promise<number | null> {
        try {
            const fileSet = new FileSet({ fileService, filters });
            return await fileSet.fetchTotalCount();
        } catch {
            return null;
        }
    }

    async function handleSubmit(e?: React.FormEvent) {
        e?.preventDefault();
        const trimmed = inputValue.trim();
        if (!trimmed || isLoading || needsApiKey) return;

        const userMessage: ChatMessage = {
            role: "user",
            content: trimmed,
            timestamp: Date.now(),
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInputValue("");
        setIsLoading(true);

        try {
            const response = await sendChatMessage(
                updatedMessages,
                annotations,
                currentFilters,
                apiKey,
                annotationValues
            );

            const appliedFilters = applyLLMResponse(response);

            const assistantMessage: ChatMessage = {
                role: "assistant",
                content: response.message,
                timestamp: Date.now(),
                appliedFilters: appliedFilters.length > 0 ? appliedFilters : undefined,
                suggestions: response.suggestions,
                fileCount: null, // will be updated async
            };

            const newMessages = [...updatedMessages, assistantMessage];
            setMessages(newMessages);

            // Fetch file count in background after filters are applied
            if (appliedFilters.length > 0 || response.removeFilters?.length) {
                // Need to compute what filters will be active after this response
                const filtersAfterResponse = [
                    ...currentFilters.filter(
                        (f) =>
                            !(response.removeFilters || []).some(
                                (rf) => rf.annotationName === f.name
                            )
                    ),
                    ...appliedFilters,
                ];
                fetchFileCount(filtersAfterResponse).then((count) => {
                    setMessages((prev) => {
                        const updated = [...prev];
                        const lastIdx = updated.length - 1;
                        if (updated[lastIdx]?.role === "assistant") {
                            updated[lastIdx] = { ...updated[lastIdx], fileCount: count };
                        }
                        return updated;
                    });
                });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            const assistantMessage: ChatMessage = {
                role: "assistant",
                content: `Error: ${errorMessage}`,
                timestamp: Date.now(),
            };
            setMessages([...updatedMessages, assistantMessage]);
        } finally {
            setIsLoading(false);
        }
    }

    function handleSuggestionClick(suggestion: string) {
        setInputValue(suggestion);
        // Auto-submit
        const userMessage: ChatMessage = {
            role: "user",
            content: suggestion,
            timestamp: Date.now(),
        };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInputValue("");
        setIsLoading(true);

        sendChatMessage(updatedMessages, annotations, currentFilters, apiKey, annotationValues)
            .then((response) => {
                const appliedFilters = applyLLMResponse(response);
                const assistantMessage: ChatMessage = {
                    role: "assistant",
                    content: response.message,
                    timestamp: Date.now(),
                    appliedFilters: appliedFilters.length > 0 ? appliedFilters : undefined,
                    suggestions: response.suggestions,
                    fileCount: null,
                };
                const newMessages = [...updatedMessages, assistantMessage];
                setMessages(newMessages);

                if (appliedFilters.length > 0 || response.removeFilters?.length) {
                    const filtersAfterResponse = [
                        ...currentFilters.filter(
                            (f) =>
                                !(response.removeFilters || []).some(
                                    (rf) => rf.annotationName === f.name
                                )
                        ),
                        ...appliedFilters,
                    ];
                    fetchFileCount(filtersAfterResponse).then((count) => {
                        setMessages((prev) => {
                            const updated = [...prev];
                            const lastIdx = updated.length - 1;
                            if (updated[lastIdx]?.role === "assistant") {
                                updated[lastIdx] = { ...updated[lastIdx], fileCount: count };
                            }
                            return updated;
                        });
                    });
                }
            })
            .catch((error) => {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                setMessages([
                    ...updatedMessages,
                    {
                        role: "assistant",
                        content: `Error: ${errorMessage}`,
                        timestamp: Date.now(),
                    },
                ]);
            })
            .finally(() => setIsLoading(false));
    }

    function renderMessage(msg: ChatMessage, index: number) {
        const isUser = msg.role === "user";
        const isLatest = index === messages.length - 1;
        const isLatestAssistant = !isUser && isLatest;

        return (
            <div key={index}>
                <div
                    className={`${styles.message} ${
                        isUser ? styles.userMessage : styles.assistantMessage
                    }`}
                >
                    {msg.content}
                    {msg.fileCount !== undefined && msg.fileCount !== null && (
                        <div className={styles.fileCount}>
                            {msg.fileCount.toLocaleString()} files match
                        </div>
                    )}
                    {msg.fileCount === null &&
                        msg.appliedFilters &&
                        msg.appliedFilters.length > 0 && (
                            <div className={styles.fileCount}>Counting files...</div>
                        )}
                    {msg.appliedFilters && msg.appliedFilters.length > 0 && (
                        <div className={styles.filterChips}>
                            {msg.appliedFilters.map((f, i) => (
                                <span key={i} className={styles.filterChip}>
                                    {f.name}: {f.value || f.type}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                {isLatestAssistant && previousFilters !== null && (
                    <button className={styles.undoButton} onClick={handleUndo}>
                        Undo
                    </button>
                )}
                {isLatestAssistant && msg.suggestions && msg.suggestions.length > 0 && !isLoading && (
                    <div className={styles.suggestions}>
                        {msg.suggestions.map((s, i) => (
                            <button
                                key={i}
                                className={styles.suggestionButton}
                                onClick={() => handleSuggestionClick(s)}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <>
            <button
                className={styles.toggleButton}
                onClick={() => setIsOpen(!isOpen)}
                title="AI Chat Assistant"
            >
                {isOpen ? "\u2715" : "\u2728"}
            </button>

            {isOpen && (
                <div className={styles.panel}>
                    <div className={styles.header}>
                        <span className={styles.headerTitle}>AI File Search</span>
                        <div>
                            <button
                                className={styles.newChatButton}
                                onClick={() => {
                                    setMessages([]);
                                    setPreviousFilters(null);
                                }}
                                title="New Chat"
                            >
                                New
                            </button>
                            <button
                                className={styles.settingsButton}
                                onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                                title="API Key Settings"
                            >
                                {"\u2699"}
                            </button>
                            <button className={styles.closeButton} onClick={() => setIsOpen(false)}>
                                {"\u2715"}
                            </button>
                        </div>
                    </div>

                    {(needsApiKey || showApiKeyInput) && (
                        <div className={styles.apiKeyArea}>
                            <label className={styles.apiKeyLabel}>Claude API Key</label>
                            <div className={styles.apiKeyRow}>
                                <input
                                    type="password"
                                    className={styles.apiKeyInput}
                                    placeholder="sk-ant-..."
                                    value={apiKeyDraft}
                                    onChange={(e) => setApiKeyDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveApiKey();
                                    }}
                                />
                                <button
                                    className={styles.apiKeySaveButton}
                                    onClick={handleSaveApiKey}
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    )}

                    <div className={styles.activeFiltersBar}>
                        <div className={styles.activeFiltersHeader}>
                            <span className={styles.activeFiltersLabel}>
                                Active Filters ({currentFilters.length})
                            </span>
                            {currentFilters.length > 0 && (
                                <button className={styles.clearAllButton} onClick={handleClearAll}>
                                    Clear all
                                </button>
                            )}
                        </div>
                        {currentFilters.length === 0 ? (
                            <span className={styles.noFilters}>No filters applied</span>
                        ) : (
                            <div className={styles.activeFilterChips}>
                                {currentFilters.map((f, i) => (
                                    <span key={i} className={styles.activeFilterChip}>
                                        {getFilterDisplayName(f)}
                                        <button
                                            className={styles.removeChipButton}
                                            onClick={() => handleRemoveFilter(f)}
                                        >
                                            {"\u2715"}
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className={styles.messages}>
                        {messages.length === 0 && (
                            <div className={styles.emptyState}>
                                Ask me to find files.
                                <br />
                                e.g. &quot;Show me all CSV files&quot;
                            </div>
                        )}
                        {messages.map(renderMessage)}
                        {isLoading && <div className={styles.loadingDots}>Thinking...</div>}
                        <div ref={messagesEndRef} />
                    </div>

                    <form className={styles.inputArea} onSubmit={handleSubmit}>
                        <input
                            className={styles.textInput}
                            type="text"
                            placeholder={
                                needsApiKey ? "Enter API key first" : "Ask about your files..."
                            }
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            disabled={needsApiKey}
                        />
                        <button
                            type="submit"
                            className={styles.sendButton}
                            disabled={isLoading || !inputValue.trim() || needsApiKey}
                        >
                            Send
                        </button>
                    </form>
                </div>
            )}
        </>
    );
}
