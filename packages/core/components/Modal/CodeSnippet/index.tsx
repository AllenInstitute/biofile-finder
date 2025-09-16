// components/Modal/CodeSnippet/CodeSnippet.tsx
import { DirectionalHint, TooltipHost } from "@fluentui/react";
import * as React from "react";
import SyntaxHighlighter from "react-syntax-highlighter";

import BaseModal from "../BaseModal";
import { PrimaryButton, TertiaryButton } from "../../Buttons";

import styles from "./CodeSnippet.module.css";

const PYTHON_PANDAS_MINIMUM = "Python 3.8+ (pandas)";

export interface CodeSnippetProps {
    onDismiss: () => void;
    code?: string;
    setup?: string;
    title?: string;
}

/**
 * Body-only variant, suitable for embedding inside other modals/layouts.
 * (No BaseModal wrapper here.)
 */
export function CodeSnippetBody({
    code,
    setup,
    title = "Code snippet",
}: {
    code?: string;
    setup?: string;
    title?: string;
}) {
    const [isSetupCopied, setSetupCopied] = React.useState(false);
    const [isCodeCopied, setCodeCopied] = React.useState(false);
    const [language, setLanguage] = React.useState(PYTHON_PANDAS_MINIMUM);

    const onCopySetup = () => {
        if (setup) {
            navigator.clipboard.writeText(setup);
            setSetupCopied(true);
            setCodeCopied(false);
        }
    };
    const onCopyCode = () => {
        if (code) {
            navigator.clipboard.writeText(code);
            setSetupCopied(false);
            setCodeCopied(true);
        }
    };

    // Prevent BaseModal drag behavior from interfering with code selection
    const stopPropagationHandler = (evt: MouseEvent) => {
        evt.stopPropagation();
    };

    return (
        <div className={styles.embeddedRoot}>
            <div className={styles.languageButtonContainer}>
                <PrimaryButton
                    className={styles.languageButton}
                    menuItems={[
                        {
                            key: "python",
                            text: PYTHON_PANDAS_MINIMUM,
                            disabled: language === PYTHON_PANDAS_MINIMUM,
                            onClick() {
                                setLanguage(PYTHON_PANDAS_MINIMUM);
                            },
                        },
                    ]}
                    menuDirection={DirectionalHint.rightCenter}
                    iconName="CodeEdit"
                    text="Select language"
                    title="Select language to display code snippet for"
                />
            </div>

            <div className={styles.header}>
                <h4 className={styles.title}>{title} — Setup</h4>
                <TooltipHost content={isSetupCopied ? "Copied to clipboard!" : undefined}>
                    <TertiaryButton iconName="Copy" onClick={onCopySetup} title="Copy to clipboard" />
                </TooltipHost>
            </div>
            <SyntaxHighlighter
                className={styles.code}
                language="bash"
                onMouseDown={stopPropagationHandler}
                onMouseMove={stopPropagationHandler}
                onMouseUp={stopPropagationHandler}
            >
                {setup || ""}
            </SyntaxHighlighter>

            <div className={styles.header} style={{ marginTop: 12 }}>
                <h4 className={styles.title}>{title} — Code</h4>
                <TooltipHost content={isCodeCopied ? "Copied to clipboard!" : undefined}>
                    <TertiaryButton iconName="Copy" onClick={onCopyCode} title="Copy to clipboard" />
                </TooltipHost>
            </div>
            <SyntaxHighlighter
                className={styles.code}
                lineProps={{ style: { wordBreak: "break-all", whiteSpace: "pre-wrap" } }}
                wrapLines
                showLineNumbers={false}
                showInlineLineNumbers={false}
                language="python"
                onMouseDown={stopPropagationHandler}
                onMouseMove={stopPropagationHandler}
                onMouseUp={stopPropagationHandler}
            >
                {code || ""}
            </SyntaxHighlighter>
        </div>
    );
}

/**
 * Default export remains a full modal wrapper for backwards compatibility.
 */
export default function CodeSnippet({
    onDismiss,
    code,
    setup,
    title = "Code snippet",
}: CodeSnippetProps) {
    return (
        <BaseModal
            body={<CodeSnippetBody code={code} setup={setup} title={title} />}
            onDismiss={onDismiss}
            title={title}
        />
    );
}
