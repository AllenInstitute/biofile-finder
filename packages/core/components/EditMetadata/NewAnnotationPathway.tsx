import { IComboBoxOption, IconButton, Stack, StackItem, TextField } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import MetadataDetails, { ValueCountItem } from "./MetadataDetails";
import { PrimaryButton, SecondaryButton } from "../Buttons";
import ComboBox from "../ComboBox";
import Tooltip from "../Tooltip";
import { AnnotationType } from "../../entity/AnnotationFormatter";

import styles from "./EditMetadata.module.css";

enum EditStep {
    PASSWORD = 0, // Placeholder
    CREATE_FIELD = 1,
    EDIT_FILES = 2,
}

interface NewAnnotationProps {
    onDismiss: () => void;
    selectedFileCount: number;
}

/**
 * Component for submitting a new annotation
 * and then entering values for the selected files
 */
export default function NewAnnotationPathway(props: NewAnnotationProps) {
    const [step, setStep] = React.useState<EditStep>(EditStep.CREATE_FIELD);
    const [newValues, setNewValues] = React.useState<string | undefined>();
    const [newFieldName, setNewFieldName] = React.useState<string>("");
    const [newFieldDataType, setNewFieldDataType] = React.useState<string | undefined>();
    const [newDropdownOption, setNewDropdownOption] = React.useState<string>("");
    const [dropdownOptions, setDropdownOptions] = React.useState<IComboBoxOption[]>([]);

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

    function onSubmit() {
        // TO DO: endpoint logic is in progress on a different branch
        props.onDismiss();
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
                    <ComboBox
                        className={styles.comboBox}
                        selectedKey={`datatype-${newFieldDataType}` || undefined}
                        label="Data type"
                        placeholder="Select a data type"
                        options={Object.values(AnnotationType).map((type) => {
                            return {
                                key: `datatype-${type}`,
                                text: type,
                            };
                        })}
                        useComboBoxAsMenuWidth
                        onChange={(option) => setNewFieldDataType(option?.text || "")}
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
                <MetadataDetails
                    onChange={(value) => setNewValues(value)}
                    items={[
                        {
                            value: undefined,
                            fileCount: props.selectedFileCount,
                        } as ValueCountItem,
                    ]}
                />
            )}
            <div className={styles.footer}>
                <Stack horizontal>
                    <StackItem>
                        {step === EditStep.EDIT_FILES && (
                            <SecondaryButton
                                title="Go back"
                                text="BACK"
                                onClick={() => setStep(EditStep.CREATE_FIELD)}
                            />
                        )}
                    </StackItem>
                    <StackItem grow align="end" className={styles.footerAlignRight}>
                        <SecondaryButton title="Cancel" text="CANCEL" onClick={props.onDismiss} />
                        {step === EditStep.CREATE_FIELD && (
                            <PrimaryButton
                                className={styles.primaryButton}
                                disabled={
                                    !newFieldName ||
                                    (newFieldDataType === AnnotationType.DROPDOWN &&
                                        !dropdownOptions.length)
                                }
                                text="NEXT"
                                title="Next"
                                onClick={() => setStep(EditStep.EDIT_FILES)}
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
                                title="Submit"
                                onClick={onSubmit}
                            />
                        )}
                    </StackItem>
                </Stack>
            </div>
        </>
    );
}
