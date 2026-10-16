import * as React from "react";
import { useSelector } from "react-redux";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import CodeSnippet from "../../CodeSnippet";
import { selection } from "../../../state";

/**
 * Dialog meant to show the user a Code snippet of their active Query
 */
export default function QueryCodeSnippet({ onDismiss }: ModalProps) {
    const { code, setup } = useSelector(selection.selectors.getPythonSnippet);

    return (
        <BaseModal
            onDismiss={onDismiss}
            title="Code snippet"
            body={<CodeSnippet setup={setup} code={code} />}
        />
    );
}
