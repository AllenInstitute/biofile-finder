import { TextField, Spinner, SpinnerSize } from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction, selection } from "../../state";

import styles from "./NaturalLanguagePrompt.module.css";

interface Props {
    disabled?: boolean;
}

export default function NaturalLanguagePrompt(props: Props) {
    const dispatch = useDispatch();
    const ollamaAvailable = useSelector(interaction.selectors.getOllamaAvailable);
    const [prompt, setPrompt] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | undefined>();

    const onSubmit = React.useCallback(() => {
        if (!prompt.trim() || isLoading || props.disabled) return;
        setError(undefined);
        setIsLoading(true);
        dispatch(selection.actions.applyNaturalLanguageQuery(prompt.trim()));
        // The logic is async; use a timeout as a simple fallback to clear loading state.
        // In a production implementation, the logic would dispatch a completion action.
        setTimeout(() => setIsLoading(false), 500);
    }, [prompt, isLoading, props.disabled, dispatch]);

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
                    Ollama not detected. Start Ollama locally to enable natural language queries.
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
            <div className={styles.form}>
                <TextField
                    className={styles.input}
                    placeholder="e.g. &quot;group by cell line, only show .tiff files&quot;"
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
                        Ask
                    </button>
                )}
            </div>
            {error && <p className={styles.error}>{error}</p>}
        </div>
    );
}
