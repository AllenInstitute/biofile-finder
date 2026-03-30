import { TextField, Spinner, SpinnerSize } from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction, selection } from "../../state";
import { FAST_MODEL, SLOW_MODEL } from "../../services/OllamaService/HttpOllamaService";

import styles from "./NaturalLanguagePrompt.module.css";

type QueryMode = "filter" | "sql" | "embed";

const MODE_CONFIG: Record<
    QueryMode,
    { label: string; description: string; placeholder: string; submitLabel: string; usesModel: boolean }
> = {
    filter: {
        label: "AI Filter",
        description:
            "Describe what you want — the AI translates your request into sidebar filters and groupings.",
        placeholder: 'e.g. "group by cell line, only show .tiff files from last month"',
        submitLabel: "Ask",
        usesModel: true,
    },
    sql: {
        label: "SQL Search",
        description:
            "The AI generates a SQL query and runs it against your local data. Returns a list of matching files.",
        placeholder: 'e.g. "show files where structure is CETN1 and size is over 500 MB"',
        submitLabel: "Search",
        usesModel: true,
    },
    embed: {
        label: "Semantic",
        description:
            "Finds files by meaning using vector embeddings. Requires a pre-computed \"embedding\" column in your data source.",
        placeholder: 'e.g. "fluorescence microscopy z-stack with high resolution"',
        submitLabel: "Search",
        usesModel: false,
    },
};

interface Props {
    disabled?: boolean;
}

export default function NaturalLanguagePrompt(props: Props) {
    const dispatch = useDispatch();
    const ollamaAvailable = useSelector(interaction.selectors.getOllamaAvailable);
    const vssResults = useSelector(interaction.selectors.getVssResults);
    const [prompt, setPrompt] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | undefined>();
    const [mode, setMode] = React.useState<QueryMode>("filter");
    const [thinkLonger, setThinkLonger] = React.useState(false);

    const onModeChange = React.useCallback(
        (nextMode: QueryMode) => {
            setMode(nextMode);
            // Clear results when leaving sql/embed modes
            if (nextMode === "filter") {
                dispatch(interaction.actions.setVssResults(null));
            }
        },
        [dispatch]
    );

    // sql/embed logics signal completion by dispatching setVssResults — clear loading then
    React.useEffect(() => {
        if (vssResults !== null) {
            setIsLoading(false);
        }
    }, [vssResults]);

    const onSubmit = React.useCallback(() => {
        if (!prompt.trim() || isLoading || props.disabled) return;
        setError(undefined);
        setIsLoading(true);
        const model = thinkLonger ? SLOW_MODEL : FAST_MODEL;
        if (mode === "embed") {
            dispatch(interaction.actions.setVssResults(null));
            dispatch(selection.actions.applyVssQuery(prompt.trim(), model));
        } else if (mode === "sql") {
            dispatch(interaction.actions.setVssResults(null));
            dispatch(selection.actions.applySqlQuery(prompt.trim(), model));
        } else {
            dispatch(selection.actions.applyNaturalLanguageQuery(prompt.trim(), model));
            // filter logic has no completion signal — fall back to a timeout
            setTimeout(() => setIsLoading(false), 60000);
        }
        // Safety-net timeout for sql/embed in case logic never fires
        if (mode !== "filter") {
            setTimeout(() => setIsLoading(false), 60000);
        }
    }, [prompt, isLoading, props.disabled, dispatch, mode, thinkLonger]);

    const onKeyDown = React.useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
            }
        },
        [onSubmit]
    );

    if (!ollamaAvailable) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <span className={styles["header-icon"]}>🔮</span>
                    <span>AI Query</span>
                </div>
                <p className={styles.unavailable}>
                    AI server not detected. Ensure the smart-query-server is running at
                    http://dev-aics-smp-001:8080 to enable AI-powered queries.
                </p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <span className={styles["header-icon"]}>🔮</span>
                <span>AI Query</span>
            </div>
            <div className={styles["mode-tabs"]}>
                {(["filter", "sql", "embed"] as QueryMode[]).map((m) => (
                    <button
                        key={m}
                        className={`${styles["mode-tab"]} ${mode === m ? styles["mode-tab-active"] : ""}`}
                        onClick={() => onModeChange(m)}
                        disabled={props.disabled}
                    >
                        {MODE_CONFIG[m].label}
                    </button>
                ))}
            </div>
            <p className={styles["mode-description"]}>{MODE_CONFIG[mode].description}</p>
            <div className={styles.form}>
                <TextField
                    className={styles.input}
                    placeholder={MODE_CONFIG[mode].placeholder}
                    value={prompt}
                    onChange={(_, val) => setPrompt(val || "")}
                    onKeyDown={onKeyDown}
                    disabled={isLoading || props.disabled}
                />
                {isLoading ? (
                    <Spinner size={SpinnerSize.small} />
                ) : (
                    <button
                        className={styles["submit-button"]}
                        onClick={onSubmit}
                        disabled={!prompt.trim() || props.disabled}
                    >
                        {MODE_CONFIG[mode].submitLabel}
                    </button>
                )}
            </div>
            {MODE_CONFIG[mode].usesModel && (
                <div className={styles["think-longer-row"]}>
                    <label className={styles["think-longer-label"]}>
                        <input
                            type="checkbox"
                            checked={thinkLonger}
                            onChange={(e) => setThinkLonger(e.target.checked)}
                            disabled={isLoading || props.disabled}
                            className={styles["think-longer-checkbox"]}
                        />
                        Think longer
                    </label>
                </div>
            )}
            {error && <p className={styles.error}>{error}</p>}
            {mode !== "filter" && vssResults && vssResults.length > 0 && (
                <div className={styles["vss-results"]}>
                    <p className={styles["vss-results-label"]}>
                        {mode === "embed"
                            ? `Top ${vssResults.length} semantic matches`
                            : `${vssResults.length} file${vssResults.length === 1 ? "" : "s"} matched`}
                    </p>
                    <ol className={styles["vss-results-list"]}>
                        {vssResults.map((row, i) => {
                            const name =
                                row["File Name"] ||
                                row["file_name"] ||
                                row["name"] ||
                                row["path"] ||
                                row["file_path"] ||
                                `Result ${i + 1}`;
                            const dist =
                                typeof row._distance === "number"
                                    ? row._distance.toFixed(4)
                                    : row._distance;
                            return (
                                <li key={i} className={styles["vss-result-item"]} title={String(name)}>
                                    <span className={styles["vss-result-name"]}>{String(name)}</span>
                                    <span className={styles["vss-result-dist"]}>{dist}</span>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            )}
            {mode === "embed" && vssResults && vssResults.length === 0 && (
                <p className={styles.unavailable}>
                    No semantic matches found. Make sure your data source has a pre-computed
                    &ldquo;embedding&rdquo; column, or try{" "}
                    <button className={styles["inline-link"]} onClick={() => onModeChange("sql")}>
                        SQL Search
                    </button>
                    .
                </p>
            )}
            {mode === "sql" && vssResults && vssResults.length === 0 && (
                <p className={styles.unavailable}>
                    No files matched. Try rephrasing your question, or use{" "}
                    <button className={styles["inline-link"]} onClick={() => onModeChange("filter")}>
                        AI Filter
                    </button>{" "}
                    to browse available values.
                </p>
            )}
        </div>
    );
}
