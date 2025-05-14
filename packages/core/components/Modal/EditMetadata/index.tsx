import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import PasswordForm from "./PasswordForm";
import useAnnotationValues from "./useAnnotationValues";
import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import { PrimaryButton, SecondaryButton } from "../../Buttons";
import EditMetadataForm from "../../EditMetadata";
import useFilteredSelection from "../../../hooks/useFilteredSelection";
import { metadata, selection } from "../../../state";

import styles from "./EditMetadata.module.css";

const PROGRAM_TO_USER_MAP: Record<string, string> = {
    CellMorph: "svc_bff_cellmorph",
    EMT: "svc_bff_emt",
    Endothelial: "svc_bff_endothelial",
    IntegratedNucleus: "svc_bff_integratednucleus",
    Lumenoid: "svc_bff_lumenoid",
    NucMorph: "svc_bff_nucmorph",
    Synthoid: "svc_bff_synthoid",
};

/**
 * Dialog to display workflow for editing metadata for selected files
 */
export default function EditMetadata({ onDismiss }: ModalProps) {
    const dispatch = useDispatch();
    const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState<boolean>(false);
    const [showWarning, setShowWarning] = React.useState<boolean>(false);
    const [isInvalidPassword, setIsInvalidPassword] = React.useState(false);
    const [program, setProgram] = React.useState<string>();
    const isQueryingAicsFms = useSelector(selection.selectors.isQueryingAicsFms);
    const passwordToProgramMap = useSelector(metadata.selectors.getPasswordToProgramMap);

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

    React.useEffect(() => {
        if (!passwordToProgramMap) {
            dispatch(metadata.actions.requestPasswordMapping());
        }
    }, [dispatch, passwordToProgramMap]);

    const onEnterPassword = (password: string) => {
        if (passwordToProgramMap) {
            const program = programsInSelection?.includes(passwordToProgramMap[password])
                ? passwordToProgramMap[password]
                : undefined;
            setProgram(program);
            setIsInvalidPassword(!program);
        }
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
                loading={!passwordToProgramMap}
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
