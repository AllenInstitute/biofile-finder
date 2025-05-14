import { IconButton, Stack, StackItem, TextField } from "@fluentui/react";
import classNames from "classnames";
import Fuse from "fuse.js";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import MetadataDetails, { ValueCountItem } from "./MetadataDetails";
import { PrimaryButton, SecondaryButton } from "../Buttons";
import ComboBox from "../ComboBox";
import LoadingIcon from "../Icons/LoadingIcon";
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
    setHasUnsavedChanges: (arg: boolean) => void;
    selectedFileCount: number;
    user?: string;
}

// Simplified version of status message
interface AnnotationStatus {
    status: ProcessStatus;
    message: string | undefined;
}

const FUZZY_SEARCH_OPTIONS = {
    // which keys on FilterItem to search
    keys: [{ name: "key", weight: 1.0 }],
    // return resulting matches sorted
    shouldSort: true,
    // 0.0 requires a perfect match, 1.0 would match anything
    threshold: 0.2,
};

/**
 * Component for submitting a new annotation
 * and then entering values for the selected files
 */
export default function NewAnnotationPathway(props: NewAnnotationProps) {
    const dispatch = useDispatch();
    // Destructure to prevent unnecessary useEffect triggers
    const { onDismiss, setHasUnsavedChanges } = props;

    const [step, setStep] = React.useState<EditStep>(EditStep.CREATE_FIELD);
    const [newValues, setNewValues] = React.useState<AnnotationValue | undefined>();
    const [newFieldName, setNewFieldName] = React.useState("");
    const [newFieldDescription, setNewFieldDescription] = React.useState("");
    const [newFieldDataType, setNewFieldDataType] = React.useState(AnnotationType.STRING);
    const [newDropdownOption, setNewDropdownOption] = React.useState("");
    const [dropdownOptions, setDropdownOptions] = React.useState<string[]>([]);
    const [submissionStatus, setSubmissionStatus] = React.useState<AnnotationStatus | undefined>();
    // Distinguish between errors (blocking) and warnings
    const [hasNameErrors, setHasNameErrors] = React.useState(false);
    const [nameWarnings, setNameWarnings] = React.useState<string[]>([]);

    const annotationOptions = useSelector(metadata.selectors.getSortedAnnotations).map(
        (annotation) => ({
            key: annotation.name,
            text: annotation.displayName,
            data: annotation.type,
        })
    );
    const fuse = React.useMemo(() => new Fuse(annotationOptions, FUZZY_SEARCH_OPTIONS), [
        annotationOptions,
    ]);
    const similarExistingFields = React.useMemo(() => fuse.search(newFieldName), [
        newFieldName,
        fuse,
    ]);

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
                                message: `Failed to edit selected files with new field: ${e}`,
                            });
                        } finally {
                            setHasUnsavedChanges(false);
                            onDismiss();
                        }
                    }
                default:
                    return;
            }
        };
        checkForStatusUpdates();
    }, [
        annotationCreationStatus,
        dispatch,
        setHasUnsavedChanges,
        newFieldName,
        newValues,
        onDismiss,
    ]);

    const onChangeAlphanumericField = (
        e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>,
        newValue: string | undefined
    ) => {
        const regex = /^[\w\-\s]+$/g;
        // Restricts character entry to alphanumeric
        if (newValue && !regex.test(newValue)) {
            e.preventDefault();
        } else {
            setNewFieldName(newValue || "");
        }
    };

    const validateFieldName = (value: string) => {
        const matchingAnnotation = similarExistingFields.find(
            (annotation) =>
                annotation.key.toLocaleLowerCase().trim() === value.toLocaleLowerCase().trim()
        );
        // Exact match should be a blocking error
        if (matchingAnnotation) {
            setNameWarnings([]);
            setHasNameErrors(true);
            return (
                <div className={styles.errorMessage}>
                    Error: Metadata field name/key &quot;{matchingAnnotation.key}&quot; already
                    exists.
                    <br />
                    Switch to <i>Existing field</i> to edit pre-existing or try an alternate field
                    name.
                </div>
            );
        } else if (similarExistingFields.length > 0) {
            // Similar but not exact match, just warn for the 3 most similar (arbitrary small number)
            setNameWarnings(similarExistingFields.slice(0, 3).map((field) => field.key));
            setHasNameErrors(false);
        } else {
            // Reset existing warnings & errors
            setNameWarnings([]);
            setHasNameErrors(false);
        }
    };

    const nameWarningComponent = () => {
        if (nameWarnings.length > 0) {
            return (
                <div className={styles.warningMessage}>
                    Caution: Similar field name(s)/key(s) found.
                    <ul className={styles.warningMessageFields}>
                        {nameWarnings.map((name) => {
                            return <li key={name}> {name} </li>;
                        })}
                    </ul>
                    You may want to switch to <i>Existing field</i> to edit pre-existing or try an
                    alternate field name.
                </div>
            );
        } else <></>;
    };

    const addDropdownChip = (evt: React.FormEvent) => {
        evt.preventDefault();
        if (
            newDropdownOption &&
            !dropdownOptions.filter((opt) => opt === newDropdownOption).length
        ) {
            setDropdownOptions([...dropdownOptions, newDropdownOption]);
            setNewDropdownOption("");
        }
    };

    const removeDropdownChip = (optionToRemove: string) => {
        setDropdownOptions(dropdownOptions.filter((opt) => opt !== optionToRemove));
    };

    function onCreateNewAnnotation() {
        setHasUnsavedChanges(true);
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
            description: newFieldDescription,
            type: newFieldDataType,
        });
        // File editing step occurs after dispatch is processed and status is updated
        dispatch(metadata.actions.createAnnotation(annotation, dropdownOptions, props.user));
    }

    return (
        <>
            <TextField
                required
                label="New metadata field name (key)"
                className={classNames(styles.textField, {
                    [styles.textFieldError]: hasNameErrors,
                })}
                onChange={(ev, newValue) => onChangeAlphanumericField(ev, newValue)}
                onGetErrorMessage={validateFieldName}
                placeholder="Add a new field name..."
                validateOnFocusOut
                value={newFieldName}
            />
            {nameWarningComponent()}
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
                        options={Object.values(AnnotationType)
                            .filter((type) => type !== AnnotationType.LOOKUP)
                            .map((type) => {
                                const text =
                                    type === AnnotationType.BOOLEAN ? "Boolean (true/false)" : type;
                                return {
                                    key: type,
                                    text,
                                };
                            })}
                        onChange={(option) =>
                            setNewFieldDataType(
                                (option?.key as AnnotationType) || AnnotationType.STRING
                            )
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
                                    <div key={option} className={styles.selectedOptionContainer}>
                                        <Tooltip content={option}>
                                            <p className={styles.selectedOption}>{option}</p>
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
                                <LoadingIcon className={styles.spinner} />
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
                                    hasNameErrors ||
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
                                    hasNameErrors ||
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
