import * as React from "react";
import { useSelector } from "react-redux";

import BaseModal from "../BaseModal";
import { interaction } from "../../../state";
import { ModalProps } from "..";
import CodeSnippet from "../../CodeSnippet";

/**
 * Dialog meant to show the user a Code snippet of their active Query
 */
export default function QueryCodeSnippet({ onDismiss }: ModalProps) {
    const { code, setup } = useSelector(interaction.selectors.getPythonSnippet);

    return (
        <BaseModal
            onDismiss={onDismiss}
            title="Code snippet"
            body={<CodeSnippet setup={setup} code={code} />}
        />
    );
}
