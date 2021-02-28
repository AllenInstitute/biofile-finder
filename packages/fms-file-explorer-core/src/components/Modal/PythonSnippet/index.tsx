import { IconButton, TooltipHost } from "@fluentui/react";
import * as React from "react";
import { useSelector } from "react-redux";
import SyntaxHighlighter from "react-syntax-highlighter";

import { ModalProps } from "..";
import { interaction } from "../../../state";
import BaseModal from "../BaseModal";

const styles = require("./PythonSnippet.module.css");

const COPY_ICON = { iconName: "copy" };

/**
 * Dialog meant to show the user a Python snippet
 */
export default function PythonSnippet({ onDismiss }: ModalProps) {
    const pythonSnippet = useSelector(interaction.selectors.getPythonSnippet);
    const code = pythonSnippet && pythonSnippet.code;
    const setup = pythonSnippet && pythonSnippet.setup;

    const [isSetupCopied, setSetupCopied] = React.useState(false);
    const [isCodeCopied, setCodeCopied] = React.useState(false);

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
            <div className={styles.header}>
                <h4>Setup</h4>
                <TooltipHost content={isSetupCopied ? "Copied to clipboard!" : undefined}>
                    <IconButton
                        className={styles.copyButton}
                        iconProps={COPY_ICON}
                        onClick={onCopySetup}
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
                    <IconButton
                        className={styles.copyButton}
                        iconProps={COPY_ICON}
                        onClick={onCopyCode}
                    />
                </TooltipHost>
            </div>
            <SyntaxHighlighter
                className={styles.code}
                language="python"
                onMouseDown={stopPropagationHandler}
                onMouseMove={stopPropagationHandler}
                onMouseUp={stopPropagationHandler}
            >
                {code || ""}
            </SyntaxHighlighter>
        </>
    );

    return <BaseModal body={body} onDismiss={onDismiss} title="Python snippet" />;
}
