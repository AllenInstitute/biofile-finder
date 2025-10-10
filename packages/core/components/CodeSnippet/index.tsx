import * as React from "react";
import classNames from "classnames";
import { TertiaryButton } from "../Buttons";

import styles from "./CodeSnippet.module.css";

export interface CodeSnippetProps {
    className?: string;
    setup?: string;
    code?: string;
}

export default function CodeSnippet({ className, setup, code }: CodeSnippetProps) {
    return (
        <div className={classNames(styles.root, className)}>
            {typeof setup === "string" && (
                <SnippetSection title="Setup" text={setup} copyAria="Copy setup" />
            )}
            {typeof code === "string" && (
                <SnippetSection title="Code" text={code} copyAria="Copy code" />
            )}
        </div>
    );
}

function SnippetSection({
    title,
    text,
    copyAria,
}: {
    title: string;
    text?: string;
    copyAria?: string;
}) {
    const [copied, setCopied] = React.useState(false);
    const value = text ?? "";

    const onCopy = () => {
        if (!value) return;
        navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 900);
    };

    const stopPropagationHandler = (evt: React.MouseEvent) => {
        evt.stopPropagation();
    };

    const tooltipText = copied ? "Copied!" : "Copy to clipboard";

    return (
        <div className={styles.sectionBlock}>
            <div className={styles.snipHeader}>
                <div className={styles.snipTitle}>{title}</div>
                <TertiaryButton
                    iconName="Copy"
                    aria-label={copyAria}
                    title={tooltipText}
                    className={styles.snipCopyBtn}
                    onClick={onCopy}
                />
            </div>

            <pre
                className={styles.codeBox}
                onMouseDown={stopPropagationHandler}
                onMouseMove={stopPropagationHandler}
                onMouseUp={stopPropagationHandler}
            >
                <code>
                    {value ||
                        (title.toLowerCase().includes("setup") ? "# Install..." : "# Code...")}
                </code>
            </pre>
        </div>
    );
}
