import {
    Checkbox,
    PrimaryButton,
    TextField,
} from "@fluentui/react";
import * as React from "react";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";

const styles = require("./ViewForm.module.css");

/**
 * TODO
 */
export default function ViewForm({ onDismiss }: ModalProps) {
    const [name, setName] = React.useState<string>();
    const [isPrivate, setPrivate] = React.useState(true);

    const body = (
        <>
            <p className={styles.helpText}>In order to reference this view, give it a name. Check this view as private to prevent others from discovering it. The view can later be references to reconfigure the explorer app to the filters, sorting, and groupings selected at the time of the view's creation.</p>
            <TextField
                label="Name"
                onChange={(_, v) => setName(v)}
                value={name}
            />
            <Checkbox
                className={styles.isPrivateCheckbox}
                onChange={(_, checked) => setPrivate(!!checked)}
                label="Is Private?"
                checked={isPrivate}
            />
        </>
    );

    return (
        <BaseModal
            body={body}
            footer={
                <PrimaryButton
                    text="Create"
                    disabled={!name?.trim()}
                    onClick={onDismiss}
                />
            }
            onDismiss={onDismiss}
            title="Create View"
        />
    );
}
