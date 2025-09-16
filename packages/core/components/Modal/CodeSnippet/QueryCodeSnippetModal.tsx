import * as React from "react";
import { useSelector } from "react-redux";
import { interaction } from "../../../state";
import { ModalProps } from "..";
import CodeSnippet from ".";

/**
 * Dialog meant to show the user a Code snippet of their active Query
 */
export default function QueryCodeSnippet({ onDismiss }: ModalProps) {
    const { code, setup } = useSelector(interaction.selectors.getPythonSnippet);

    return <CodeSnippet onDismiss={onDismiss} code={code} setup={setup} title="Code snippet" />;
}
