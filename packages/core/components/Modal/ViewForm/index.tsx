import {
    Checkbox,
    PrimaryButton,
    TextField,
} from "@fluentui/react";
import * as React from "react";
import { useSelector } from "react-redux";

import { ModalProps } from "..";
import { metadata, selection } from "../../../state";
import BaseModal from "../BaseModal";

const styles = require("./ViewForm.module.css");

/**
 * TODO
 */
export default function ViewForm({ onDismiss }: ModalProps) {
    const viewId = useSelector(selection.selectors.getViewId);
    const views = useSelector(metadata.selectors.getViews);

    const view = views.find(v => v.id === viewId);
    
    const [name, setName] = React.useState<string>();
    const [isPrivate, setPrivate] = React.useState(true);

    React.useEffect(() => {
        setName(view?.name);
    }, [view, setName])

    const body = (
        <>
            <p className={styles.helpText}>Create a view of your current filters, groupings, and sort to save this configuration and load it up again at another time. In order to reference this view, give it a name. Check this view as private to prevent others from discovering it.</p>
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
                    text={view ? "Update" : "Create"}
                    disabled={!name?.trim()}
                    onClick={onDismiss}
                />
            }
            onDismiss={onDismiss}
            title={view ? `Update ${view.name}` : "Create View"}
        />
    );
}
