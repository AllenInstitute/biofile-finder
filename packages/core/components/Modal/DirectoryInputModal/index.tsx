import * as React from "react";

import { ModalProps } from "../index.js";
import BaseModal from "../BaseModal";

import DirectoryInput from "./DirectoryInput";

/**
 * TODO
 */
export default function DirectoryInputModal({ onDismiss }: ModalProps) {
    return (
        <BaseModal
            body={<DirectoryInput />}
            footer={undefined}
            onDismiss={onDismiss}
            title=""
        />
    );
}
