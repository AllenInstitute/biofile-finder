import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import FileFilter, { FilterType } from "../../entity/FileFilter";
import FileSort, { SortOrder } from "../../entity/FileSort";
import { metadata, selection } from "../../state";
import { sendChatMessage } from "./ChatService";
import { ChatMessage, LLMResponse } from "./types";

import styles from "./ChatPanel.module.css";

const API_KEY_STORAGE_KEY = "claude-api-key";

export default function ChatPanel() {
    const dispatch = useDispatch();
    const annotations = useSelector(metadata.selectors.getAnnotations);
    const currentFilters = useSelector(selection.selectors.getFileFilters);

    const [isOpen, setIsOpen] = React.useState(false);
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
                response.removeFilters!.some((rf) => rf.annotationName === f.name)
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
                apiKey
            );

            const appliedFilters = applyLLMResponse(response);

            const assistantMessage: ChatMessage = {
                role: "assistant",
                content: response.message,
                timestamp: Date.now(),
                appliedFilters: appliedFilters.length > 0 ? appliedFilters : undefined,
            };

            setMessages([...updatedMessages, assistantMessage]);
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

    function renderMessage(msg: ChatMessage, index: number) {
        const isUser = msg.role === "user";
        const isLatestAssistant =
            !isUser && index === messages.length - 1 && msg.appliedFilters?.length;

        return (
            <div key={index}>
                <div
                    className={`${styles.message} ${
                        isUser ? styles.userMessage : styles.assistantMessage
                    }`}
                >
                    {msg.content}
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
