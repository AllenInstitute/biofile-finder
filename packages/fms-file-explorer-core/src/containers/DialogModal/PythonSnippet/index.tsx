import { Dialog, IconButton, TooltipHost } from "office-ui-fabric-react";
import * as React from "react";
import { useSelector } from "react-redux";
import SyntaxHighlighter from "react-syntax-highlighter";

import { DialogModalProps } from "..";
import { interaction } from "../../../state";

const styles = require("./PythonSnippet.module.css");

const MODAL_PROPS = {
    containerClassName: styles.dialog,
    isBlocking: false,
};

const COPY_ICON = { iconName: "copy" };

/**
 * Dialog meant to show the user a Python snippet
 */
export default function PythonSnippet({ onDismiss }: DialogModalProps) {
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

    return (
        <Dialog hidden={false} onDismiss={onDismiss} modalProps={MODAL_PROPS}>
            <div className={styles.header}>
                <span className={styles.label}>Setup</span>
                <TooltipHost content={isSetupCopied ? "Copied to clipboard!" : undefined}>
                    <IconButton
                        className={styles.copyButton}
                        iconProps={COPY_ICON}
                        onClick={onCopySetup}
                    />
                </TooltipHost>
            </div>
            <SyntaxHighlighter language="bash">{setup || ""}</SyntaxHighlighter>
            <div className={styles.header}>
                <span className={styles.label}>Code</span>
                <TooltipHost content={isCodeCopied ? "Copied to clipboard!" : undefined}>
                    <IconButton
                        className={styles.copyButton}
                        iconProps={COPY_ICON}
                        onClick={onCopyCode}
                    />
                </TooltipHost>
            </div>
            <SyntaxHighlighter language="python">{code || ""}</SyntaxHighlighter>
        </Dialog>
    );
}
