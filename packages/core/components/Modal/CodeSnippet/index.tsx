import { DirectionalHint, TooltipHost } from "@fluentui/react";
import * as React from "react";
import { useSelector } from "react-redux";
import SyntaxHighlighter from "react-syntax-highlighter";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import { PrimaryButton, TertiaryButton } from "../../Buttons";
import { interaction } from "../../../state";

import styles from "./CodeSnippet.module.css";

const PYTHON_PANDAS_MINIMUM = "Python 3.8+ (pandas)";

/**
 * Dialog meant to show the user a Code snippet
 */
export default function CodeSnippet({ onDismiss }: ModalProps) {
    const { code, setup } = useSelector(interaction.selectors.getPythonSnippet);

    const [isSetupCopied, setSetupCopied] = React.useState(false);
    const [isCodeCopied, setCodeCopied] = React.useState(false);
    const [language, setLanguage] = React.useState(PYTHON_PANDAS_MINIMUM);

    const onCopySetup = () => {
        setup && navigator.clipboard.writeText(setup);
        // Provide feedback to user about what is copied to their clipboard
        setSetupCopied(true);
        setCodeCopied(false);
    };
    const onCopyCode = () => {
        code && navigator.clipboard.writeText(code);
        // Provide feedback to user about what is copied to their clipboard
        setSetupCopied(false);
        setCodeCopied(true);
    };

    // Prevent an event from bubbling up to its parent; useful because Modal will
    // default to interpreting mousedown/move/up events as intentions to move the modal,
    // which prevents being able to select text
    const stopPropagationHandler = (evt: MouseEvent) => {
        evt.stopPropagation();
    };

    const body = (
        <>
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
                <h4>Setup</h4>
                <TooltipHost content={isSetupCopied ? "Copied to clipboard!" : undefined}>
                    <TertiaryButton
                        iconName="Copy"
                        onClick={onCopySetup}
                        title="Copy to clipboard"
                    />
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
            <div className={styles.header}>
                <h4>Code</h4>
                <TooltipHost content={isCodeCopied ? "Copied to clipboard!" : undefined}>
                    <TertiaryButton
                        iconName="Copy"
                        onClick={onCopyCode}
                        title="Copy to clipboard"
                    />
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
        </>
    );

    return <BaseModal body={body} onDismiss={onDismiss} title="Code snippet" isDraggable />;
}
