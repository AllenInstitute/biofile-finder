import { Icon } from "@fluentui/react";
import classNames from "classnames";
import { uniqueId } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import PasswordForm from "./PasswordForm";
import useAnnotationValues from "./useAnnotationValues";
import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import { PrimaryButton, SecondaryButton } from "../../Buttons";
import EditMetadataForm from "../../EditMetadata";
import useFilteredSelection from "../../../hooks/useFilteredSelection";
import { interaction, metadata, selection } from "../../../state";

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
    const [showUnsavedWarning, setShowUnsavedWarning] = React.useState<boolean>(false);
    const [annotationToDelete, setAnnotationToDelete] = React.useState<string>("");
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
        if (hasUnsavedChanges) setShowUnsavedWarning(true);
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

    const onDeleteMetadata = () => {
        if (program) {
            dispatch(
                interaction.actions.deleteMetadata(annotationToDelete, PROGRAM_TO_USER_MAP[program])
            );
            onDismiss();
        } else {
            dispatch(
                interaction.actions.processError(
                    uniqueId(),
                    "Must have a valid program to delete metadata from files."
                )
            );
        }
    };

    const unsavedChangesWarning = (
        <>
            <p className={styles.warning}>
                Some edits will not be completed and could cause inaccuracies. Are you sure you want
                to quit now?
            </p>
            <div className={classNames(styles.footer, styles.footerAlignRight)}>
                <SecondaryButton
                    title=""
                    text="Back"
                    onClick={() => setShowUnsavedWarning(false)}
                />
                <PrimaryButton title="" text="Yes, Quit" onClick={onDismiss} />
            </div>
        </>
    );

    const deleteMetadataWarning = (
        <>
            <p className={styles.warning}>
                <b>{annotationToDelete}</b> and all associated values will be deleted from selected
                files.
            </p>
            <p className={styles.errorMessage}>
                <Icon className={styles.errorMessageIcon} iconName="Warning" />
                This action is destructive and permanent.
            </p>
            <div className={classNames(styles.footer, styles.footerAlignRight)}>
                <SecondaryButton title="" text="Back" onClick={() => setAnnotationToDelete("")} />
                <PrimaryButton title="" text="Delete" onClick={onDeleteMetadata} />
            </div>
        </>
    );

    const body =
        !isQueryingAicsFms || !!program ? (
            // Use styling on form instead of conditionals to persist rendered data
            <>
                <EditMetadataForm
                    className={classNames({
                        [styles.hidden]: showUnsavedWarning || annotationToDelete,
                    })}
                    onDelete={setAnnotationToDelete}
                    onDismiss={onDismissWithWarning}
                    setHasUnsavedChanges={setHasUnsavedChanges}
                    user={program && PROGRAM_TO_USER_MAP[program]}
                />
                {/** Use conditional instead of styling so can't be accidentally accessed,
                 * prioritizing unsaved changes warning (on exit) over deletion
                 */}
                {showUnsavedWarning && unsavedChangesWarning}
                {annotationToDelete && !showUnsavedWarning && deleteMetadataWarning}
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

    const title = React.useMemo(() => {
        if (annotationToDelete !== "") {
            return `Warning! You are deleting metadata. ${filesSelectedCountString}`;
        } else if (showUnsavedWarning) {
            return "Warning! Edits in progress.";
        } else return `Edit metadata ${filesSelectedCountString}`;
    }, [annotationToDelete, showUnsavedWarning, filesSelectedCountString]);

    return <BaseModal body={body} isStatic onDismiss={onDismissWithWarning} title={title} />;
}
