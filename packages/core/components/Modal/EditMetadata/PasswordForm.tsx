import { SpinnerSize, TextField } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import { PrimaryButton, SecondaryButton } from "../../Buttons";
import LoadingIcon from "../../Icons/LoadingIcon";

import styles from "./PasswordForm.module.css";

interface Props {
    isInvalidPassword: boolean;
    isInvalidSelection: boolean;
    onCancel: () => void;
    onEnterPassword: (password: string) => void;
    validPrograms?: string[];
}

/**
 * Form for entering a password to edit metadata, this form is specific to metadata edits.
 */
export default function PasswordForm(props: Props) {
    const [password, setPassword] = React.useState("");

    if (!props.validPrograms) {
        return (
            <>
                <p>
                    A password is required for editing or creating new metadata. Each password is
                    specific to a program, only files associated with that program can be edited.
                    Talk to your program lead for the password.
                </p>
                <LoadingIcon size={SpinnerSize.small} />
            </>
        );
    }

    let infoMessage;
    if (props.isInvalidSelection) {
        infoMessage = (
            <p className={styles.errorMessage}>
                The files you have selected do not share the same program or do not have a program
                at all.
            </p>
        );
    } else if (props.isInvalidPassword) {
        infoMessage = (
            <p className={styles.errorMessage}>
                Incorrect password for any of the following programs:{" "}
                <strong>{props.validPrograms.join(", ")}</strong>. Please try again.
            </p>
        );
    } else {
        infoMessage = (
            <p>
                The files you have selected are associated with the following programs:{" "}
                <strong>{props.validPrograms.join(", ")}</strong>
            </p>
        );
    }

    return (
        <>
            <p>
                A password is required for editing or creating new metadata. Each password is
                specific to a program, only files associated with that program can be edited. Talk
                to your program lead for the password.
            </p>
            {infoMessage}
            <h4 className={styles.passwordLabel}>Password</h4>
            <TextField
                className={styles.passwordInput}
                disabled={props.isInvalidSelection}
                onChange={(_, newValue) => setPassword(newValue || "")}
                placeholder="Enter password..."
            />
            <div className={classNames(styles.footer, styles.footerAlignRight)}>
                <SecondaryButton title="" text="CANCEL" onClick={props.onCancel} />
                <PrimaryButton
                    className={styles.primaryButton}
                    disabled={props.isInvalidSelection || !password.trim()}
                    title="SUBMIT"
                    text="SUBMIT"
                    onClick={() => props.onEnterPassword(password)}
                />
            </div>
        </>
    );
}
