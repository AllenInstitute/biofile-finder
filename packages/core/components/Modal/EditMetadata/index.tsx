import classNames from "classnames";
import * as React from "react";
import { useSelector } from "react-redux";

import PasswordForm from "./PasswordForm";
import useAnnotationValues from "./useAnnotationValues";
import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import { PrimaryButton, SecondaryButton } from "../../Buttons";
import EditMetadataForm from "../../EditMetadata";
import useFilteredSelection from "../../../hooks/useFilteredSelection";
import { selection } from "../../../state";

import styles from "./EditMetadata.module.css";

// Hard-coded mapping of passwords to programs, due to this being an internal
// specific feature, this is acceptable for now. However, we should think about
// a more robust solution in the future such as login or a more secure method.
// or find a way to get this information passed in via GH secrets to the packaged
// web bundle
const PASSWORD_TO_PROGRAM_MAP: Record<string, string> = {
    S6KNQ7SW: "EMT",
    V2SYXAQK: "IntegratedNucleus",
    SENX6787: "NucMorph",
};

const PROGRAM_TO_USER_MAP: Record<string, string> = {
    EMT: "svc_bff_emt",
    IntegratedNucleus: "svc_bff_integratednucleus",
    NucMorph: "svc_bff_nucmorph",
};

/**
 * Dialog to display workflow for editing metadata for selected files
 */
export default function EditMetadata({ onDismiss }: ModalProps) {
    const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState<boolean>(false);
    const [showWarning, setShowWarning] = React.useState<boolean>(false);
    const [isInvalidPassword, setIsInvalidPassword] = React.useState(false);
    const [program, setProgram] = React.useState<string>();
    const isQueryingAicsFms = useSelector(selection.selectors.isQueryingAicsFms);

    const fileSelection = useFilteredSelection();
    const programsInSelection = useAnnotationValues(fileSelection, "Program") as
        | string[]
        | undefined;

    const totalFilesSelected = fileSelection.count();
    const filesSelectedCountString = `(${totalFilesSelected} file${
        totalFilesSelected === 1 ? "" : "s"
    })`;

    function onDismissWithWarning() {
        if (hasUnsavedChanges) setShowWarning(true);
        else onDismiss();
    }

    const onEnterPassword = (password: string) => {
        const program = programsInSelection?.includes(PASSWORD_TO_PROGRAM_MAP[password])
            ? PASSWORD_TO_PROGRAM_MAP[password]
            : undefined;
        setProgram(program);
        setIsInvalidPassword(!program);
    };

    const body =
        !isQueryingAicsFms || !!program ? (
            // Use styling on form instead of conditionals to persist rendered data
            <>
                <EditMetadataForm
                    className={classNames({ [styles.hidden]: showWarning })}
                    onDismiss={onDismissWithWarning}
                    setHasUnsavedChanges={setHasUnsavedChanges}
                    user={program && PROGRAM_TO_USER_MAP[program]}
                />
                <div className={classNames({ [styles.hidden]: !showWarning })}>
                    <p className={styles.warning}>
                        Some edits will not be completed and could cause inaccuracies. Are you sure
                        you want to quit now?
                    </p>
                    <div className={classNames(styles.footer, styles.footerAlignRight)}>
                        <SecondaryButton
                            title=""
                            text="Back"
                            onClick={() => setShowWarning(false)}
                        />
                        <PrimaryButton title="" text="Yes, Quit" onClick={onDismiss} />
                    </div>
                </div>
            </>
        ) : (
            <PasswordForm
                isInvalidPassword={isInvalidPassword}
                isInvalidSelection={!programsInSelection?.length}
                onCancel={onDismiss}
                onEnterPassword={onEnterPassword}
                validPrograms={programsInSelection}
            />
        );

    return (
        <BaseModal
            body={body}
            isStatic
            onDismiss={onDismissWithWarning}
            title={
                showWarning
                    ? "Warning! Edits in progress."
                    : `Edit metadata ${filesSelectedCountString}`
            }
        />
    );
}
