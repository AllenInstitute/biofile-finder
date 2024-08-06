import * as React from "react";
import { useDispatch } from "react-redux";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import Checkbox from "../../Checkbox";
import { PrimaryButton } from "../../Buttons";
import { interaction } from "../../../state";

import styles from "./SmallScreen.module.css";

/**
 * Modal overlay for selecting columns to be included in a metadata manifest download of
 * files previously selected.
 */
export default function SmallScreenWarning({ onDismiss }: ModalProps) {
    const dispatch = useDispatch();
    const [dontShowAgain, setDontShowAgain] = React.useState(false);
    const title = "This app is not optimized for use on small screens.";
    const body = (
        <>
            <p>For optimal experience, please try with a minimum screen width of 768px.</p>
            <Checkbox
                label="Don't show this message again"
                onChange={(_, isChecked) => setDontShowAgain(!!isChecked)}
            />
        </>
    );
    function _onDismiss() {
        if (dontShowAgain) dispatch(interaction.actions.markAsDismissedSmallScreenWarning());
        onDismiss();
    }
    return (
        <BaseModal
            body={body}
            footer={
                <PrimaryButton
                    className={styles.okButton}
                    onClick={_onDismiss}
                    title="OK"
                    text="OK"
                    iconName=""
                />
            }
            onDismiss={_onDismiss}
            title={title}
        />
    );
}
