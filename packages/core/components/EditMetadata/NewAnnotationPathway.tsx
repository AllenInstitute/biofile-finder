import {
    IComboBoxOption,
    IconButton,
    Spinner,
    SpinnerSize,
    Stack,
    StackItem,
    TextField,
} from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import MetadataDetails, { ValueCountItem } from "./MetadataDetails";
import { PrimaryButton, SecondaryButton } from "../Buttons";
import ComboBox from "../ComboBox";
import Tooltip from "../Tooltip";
import Annotation from "../../entity/Annotation";
import { AnnotationType } from "../../entity/AnnotationFormatter";
import { AnnotationValue } from "../../services/AnnotationService";
import { interaction, metadata } from "../../state";
import { ProcessStatus } from "../../state/interaction/actions";

import styles from "./EditMetadata.module.css";

enum EditStep {
    PASSWORD = 0, // Placeholder
    CREATE_FIELD = 1,
    EDIT_FILES = 2,
}

interface NewAnnotationProps {
    onDismiss: () => void;
    hasUnsavedChanges: (arg: boolean) => void;
    selectedFileCount: number;
}

// Simplified version of status message
interface AnnotationStatus {
    status: ProcessStatus;
    message: string | undefined;
}

/**
 * Component for submitting a new annotation
 * and then entering values for the selected files
 */
export default function NewAnnotationPathway(props: NewAnnotationProps) {
    const dispatch = useDispatch();
    // Destructure to prevent unnecessary useEffect triggers
    const { onDismiss, hasUnsavedChanges } = props;

    const [step, setStep] = React.useState<EditStep>(EditStep.CREATE_FIELD);
    const [newValues, setNewValues] = React.useState<AnnotationValue | undefined>();
    const [newFieldName, setNewFieldName] = React.useState<string>("");
    const [newFieldDescription, setNewFieldDescription] = React.useState<string>("");
    const [newFieldDataType, setNewFieldDataType] = React.useState<AnnotationType | undefined>();
    const [newDropdownOption, setNewDropdownOption] = React.useState<string>("");
    const [dropdownOptions, setDropdownOptions] = React.useState<IComboBoxOption[]>([]);
    const [submissionStatus, setSubmissionStatus] = React.useState<AnnotationStatus | undefined>();

    const statuses = useSelector(interaction.selectors.getProcessStatuses);
    const annotationCreationStatus = React.useMemo(
        () => statuses.find((status) => status.processId === newFieldName),
        [newFieldName, statuses]
    );
    // Check for updates to the annotation submission status
    React.useEffect(() => {
        const checkForStatusUpdates = async () => {
            const currentStatus = annotationCreationStatus?.data?.status;
            switch (currentStatus) {
                case ProcessStatus.ERROR:
                case ProcessStatus.STARTED:
                case ProcessStatus.PROGRESS:
                    setSubmissionStatus({
                        status: currentStatus,
                        message: annotationCreationStatus?.data?.msg,
                    });
                    return;
                case ProcessStatus.SUCCEEDED:
                    if (newFieldName && newValues) {
                        try {
                            dispatch(
                                interaction.actions.editFiles({ [newFieldName]: [newValues] })
                            );
                        } catch (e) {
                            setSubmissionStatus({
                                status: ProcessStatus.ERROR,
                                message: `Failed to create annotation: ${e}`,
                            });
                        } finally {
                            hasUnsavedChanges(false);
                            onDismiss();
                        }
                    }
                default:
                    return;
            }
        };
        checkForStatusUpdates();
    }, [annotationCreationStatus, dispatch, hasUnsavedChanges, newFieldName, newValues, onDismiss]);

    const addDropdownChip = (evt: React.FormEvent) => {
        evt.preventDefault();
        if (
            newDropdownOption &&
            !dropdownOptions.filter((opt) => opt.key === newDropdownOption).length
        ) {
            const newOptionAsIComboBox: IComboBoxOption = {
                key: newDropdownOption,
                text: newDropdownOption,
            };
            setDropdownOptions([...dropdownOptions, newOptionAsIComboBox]);
            setNewDropdownOption("");
        }
    };

    const removeDropdownChip = (optionToRemove: IComboBoxOption) => {
        setDropdownOptions(dropdownOptions.filter((opt) => opt !== optionToRemove));
    };

    function onCreateNewAnnotation() {
        props?.hasUnsavedChanges(true);
        setStep(EditStep.EDIT_FILES);
    }

    function onSubmit() {
        if (!newFieldName || !newValues) {
            setSubmissionStatus({
                status: ProcessStatus.ERROR,
                message: `Missing ${!newFieldName ? "field name" : "values for file"}`,
            });
            return;
        }
        const annotation = new Annotation({
            annotationDisplayName: newFieldName,
            annotationName: newFieldName,
            description: newFieldDescription ?? "",
            type: newFieldDataType ?? AnnotationType.STRING,
        });
        // File editing step occurs after dispatch is processed and status is updated
        dispatch(
            metadata.actions.createAnnotation(
                annotation,
                dropdownOptions.map((opt) => opt.text)
            )
        );
    }

    return (
        <>
            {/* TO DO: Prevent user from entering a name that collides with existing annotation */}
            <TextField
                required
                label="New metadata field name"
                className={styles.textField}
                onChange={(_, newValue) => setNewFieldName(newValue || "")}
                placeholder="Add a new field name..."
                value={newFieldName}
            />
            {step === EditStep.CREATE_FIELD && (
                <>
                    <TextField
                        multiline
                        rows={2}
                        label="Description"
                        className={styles.textField}
                        onChange={(_, newValue) => setNewFieldDescription(newValue || "")}
                        placeholder="Add a short description of the new field..."
                        value={newFieldDescription}
                    />
                    <ComboBox
                        className={styles.comboBox}
                        selectedKey={newFieldDataType || undefined}
                        label="Data type"
                        placeholder="Select a data type..."
                        options={Object.values(AnnotationType).map((type) => {
                            const text =
                                type === AnnotationType.BOOLEAN ? "Boolean (true/false)" : type;
                            return {
                                key: type,
                                text,
                            };
                        })}
                        onChange={(option) =>
                            setNewFieldDataType((option?.key as AnnotationType) || "")
                        }
                    />
                    {newFieldDataType === AnnotationType.DROPDOWN && (
                        <>
                            <form onSubmit={addDropdownChip}>
                                <TextField
                                    label="Add dropdown options"
                                    className={styles.textField}
                                    onChange={(_, newValue) => setNewDropdownOption(newValue || "")}
                                    placeholder="Type an option name..."
                                    iconProps={{
                                        className: classNames(styles.submitIcon),
                                        iconName: "ReturnKey",
                                        onClick: newDropdownOption ? addDropdownChip : undefined,
                                    }}
                                    value={newDropdownOption}
                                />
                            </form>
                            <div>
                                {dropdownOptions.map((option) => (
                                    <div
                                        key={option.key}
                                        className={styles.selectedOptionContainer}
                                    >
                                        <Tooltip content={option.text}>
                                            <p className={styles.selectedOption}>{option.text}</p>
                                        </Tooltip>
                                        <IconButton
                                            className={styles.selectedOptionButton}
                                            iconProps={{ iconName: "Cancel" }}
                                            onClick={() => removeDropdownChip(option)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}
            {step === EditStep.EDIT_FILES && (
                <>
                    {newFieldDescription.trim() && (
                        <>
                            <b>Description: </b> {newFieldDescription}
                        </>
                    )}
                    <MetadataDetails
                        fieldType={newFieldDataType}
                        items={[
                            {
                                value: undefined,
                                fileCount: props.selectedFileCount,
                            } as ValueCountItem,
                        ]}
                        dropdownOptions={dropdownOptions}
                        onChange={(value) => setNewValues(value)}
                    />
                    {submissionStatus && (
                        <div
                            className={classNames(
                                submissionStatus.status === ProcessStatus.ERROR
                                    ? styles.errorMessage
                                    : styles.statusMessage
                            )}
                        >
                            {submissionStatus.status === ProcessStatus.STARTED && (
                                <Spinner className={styles.spinner} size={SpinnerSize.small} />
                            )}
                            {submissionStatus?.message}
                        </div>
                    )}
                </>
            )}
            <div className={styles.footer}>
                <Stack horizontal>
                    <StackItem>
                        {step === EditStep.EDIT_FILES && (
                            <SecondaryButton
                                title=""
                                text="BACK"
                                onClick={() => setStep(EditStep.CREATE_FIELD)}
                            />
                        )}
                    </StackItem>
                    <StackItem grow align="end" className={styles.footerAlignRight}>
                        <SecondaryButton title="" text="CANCEL" onClick={props.onDismiss} />
                        {step === EditStep.CREATE_FIELD && (
                            <PrimaryButton
                                className={styles.primaryButton}
                                disabled={
                                    !newFieldName ||
                                    (newFieldDataType === AnnotationType.DROPDOWN &&
                                        !dropdownOptions.length)
                                }
                                text="NEXT"
                                title=""
                                onClick={onCreateNewAnnotation}
                            />
                        )}
                        {step === EditStep.EDIT_FILES && (
                            <PrimaryButton
                                className={styles.primaryButton}
                                disabled={
                                    !newFieldName ||
                                    (newFieldDataType === AnnotationType.DROPDOWN &&
                                        !dropdownOptions.length) ||
                                    !newValues
                                }
                                text="SUBMIT"
                                title=""
                                onClick={onSubmit}
                            />
                        )}
                    </StackItem>
                </Stack>
            </div>
        </>
    );
}
