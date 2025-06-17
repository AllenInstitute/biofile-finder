import { IComboBoxOption, Icon } from "@fluentui/react";
import classNames from "classnames";
import { uniqueId } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import MetadataDetails, { ValueCountItem } from "./MetadataDetails";
import useAnnotationValueByNameMap from "./useAnnotationValueByNameMap";
import { LinkLikeButton, PrimaryButton, SecondaryButton } from "../Buttons";
import ComboBox from "../ComboBox";
import Annotation from "../../entity/Annotation";
import { AnnotationType } from "../../entity/AnnotationFormatter";
import { interaction, metadata } from "../../state";

import styles from "./EditMetadata.module.css";

interface ExistingAnnotationProps {
    onDismiss: () => void;
    onSelectDelete: (isDeleting: boolean) => void;
    selectedFileCount: number;
    user?: string;
}

/**
 * Component for selecting an existing annotation
 * and then entering values for the selected files
 */
export default function ExistingAnnotationPathway(props: ExistingAnnotationProps) {
    const dispatch = useDispatch();
    const [newValues, setNewValues] = React.useState<string>();
    const [valueCounts, setValueCounts] = React.useState<ValueCountItem[]>();
    const [selectedAnnotation, setSelectedAnnotation] = React.useState<string>();
    const [annotationType, setAnnotationType] = React.useState<AnnotationType>();
    const [dropdownOptions, setDropdownOptions] = React.useState<string[]>();
    const [isDeleting, setIsDeleting] = React.useState<boolean>(false);

    const annotationValueByNameMap = useAnnotationValueByNameMap();
    const filters = useSelector(interaction.selectors.getFileFiltersForVisibleModal);
    const annotationService = useSelector(interaction.selectors.getAnnotationService);
    const annotationOptions: IComboBoxOption[] = Annotation.sort(
        useSelector(metadata.selectors.getAnnotations)
    ).map((annotation) => ({
        key: annotation.name,
        text: annotation.displayName,
        disabled: annotation.isImmutable,
        title: annotation.isImmutable
            ? "This field cannot be edited because it is automatically created based on another metadata field."
            : "",
        data: annotation.type,
    }));

    const onSelectMetadataField = (
        option: IComboBoxOption | undefined,
        value: string | undefined
    ) => {
        // FluentUI's combobox doesn't always register the entered value as an option,
        // so we need to be able to check both
        const selectedFieldName = option?.text || value;
        if (!selectedFieldName || !annotationOptions.some((opt) => opt.key === selectedFieldName))
            return;

        let valueMap: ValueCountItem[] = [];
        // Track how many values we've seen, since some files may not have a value for this field
        let totalValueCount = 0;
        const fieldValueToOccurenceMap = annotationValueByNameMap?.get(selectedFieldName);
        if (fieldValueToOccurenceMap) {
            valueMap = Object.keys(fieldValueToOccurenceMap).map((fieldName) => {
                totalValueCount += fieldValueToOccurenceMap[fieldName];
                return {
                    value: fieldName,
                    fileCount: fieldValueToOccurenceMap[fieldName],
                };
            });
        }
        // If some or all of the files don't have values for this annotation,
        // they won't be in the annotation map
        if (totalValueCount < props.selectedFileCount) {
            valueMap = [
                {
                    value: undefined,
                    fileCount: props.selectedFileCount - totalValueCount,
                },
                ...valueMap,
            ];
        }

        // String type annotations might be dropdown or lookup
        // If it's a dropdown, we need to fetch the dropdown options
        if (option?.data === AnnotationType.STRING) {
            annotationService
                .fetchAnnotationDetails(selectedFieldName)
                .then((response) => {
                    setSelectedAnnotation(selectedFieldName);
                    setAnnotationType(response.type);
                    setValueCounts(valueMap);
                    setDropdownOptions(response.dropdownOptions);
                })
                .catch((err) => {
                    const errMsg = `Failed to grab details for metadata field "${selectedFieldName}". Error: ${err.message}`;
                    dispatch(interaction.actions.processError(uniqueId(), errMsg));
                });
        } else {
            setSelectedAnnotation(selectedFieldName);
            setAnnotationType(option?.data);
            setValueCounts(valueMap);
            setDropdownOptions(undefined);
        }
    };

    function onClickDelete(isDeleting: boolean) {
        setIsDeleting(isDeleting);
        props.onSelectDelete(isDeleting);
    }

    function onSubmit() {
        const trimmedValues = newValues?.trim();
        const newValuesAsArray = newValues?.split(",").map((value) => value.trim());
        if (selectedAnnotation && trimmedValues && newValuesAsArray?.length) {
            annotationService
                .validateAnnotationValues(selectedAnnotation, newValuesAsArray)
                .then((isValid: boolean) => {
                    if (isValid) {
                        dispatch(
                            interaction.actions.editFiles(
                                { [selectedAnnotation]: [trimmedValues] },
                                filters,
                                props.user
                            )
                        );
                        props.onDismiss();
                    } else {
                        const errMsg = "Invalid value for selected metadata field";
                        dispatch(interaction.actions.processError(uniqueId(), errMsg));
                    }
                })
                .catch((err) => {
                    const errMsg = `Failed trying to validate metadata field, unsure why. Details: ${err.message}`;
                    dispatch(interaction.actions.processError(uniqueId(), errMsg));
                });
        } else {
            props.onDismiss();
        }
    }

    const onDeleteMetadata = () => {
        if (selectedAnnotation) {
            dispatch(interaction.actions.deleteMetadata(selectedAnnotation, props.user));
            props.onDismiss();
        }
    };

    const deleteMetadataWarning = (
        <>
            <p className={styles.deleteWarningMessage}>
                <b>{selectedAnnotation}</b> and all associated values will be deleted from selected
                files.
            </p>
            <p className={styles.deleteWarningSection}>
                <Icon iconName="Warning" />
                This action is destructive and permanent.
            </p>
            <div className={classNames(styles.footer, styles.footerAlignRight)}>
                <SecondaryButton title="" text="Back" onClick={() => onClickDelete(false)} />
                <PrimaryButton title="" text="Delete" onClick={onDeleteMetadata} />
            </div>
        </>
    );

    return isDeleting ? (
        deleteMetadataWarning
    ) : (
        <>
            <div className={styles.flexWrapper}>
                <ComboBox
                    className={styles.comboBox}
                    label="Select a metadata field"
                    placeholder="Select a field..."
                    selectedKey={selectedAnnotation}
                    options={annotationOptions}
                    onChange={onSelectMetadataField}
                    disabled={!annotationOptions.length}
                />
                {!!selectedAnnotation && (
                    <div className={styles.deleteButton}>
                        <LinkLikeButton
                            onClick={() => onClickDelete(true)}
                            text="Delete"
                            title="Delete metadata field and values"
                        />
                    </div>
                )}
            </div>
            {!!selectedAnnotation && (
                <MetadataDetails
                    dropdownOptions={dropdownOptions}
                    onChange={(value) => setNewValues(value)}
                    items={valueCounts || []}
                    fieldType={annotationType}
                />
            )}
            <div className={classNames(styles.footer, styles.footerAlignRight)}>
                <SecondaryButton title="" text="CANCEL" onClick={props.onDismiss} />
                {valueCounts && (
                    <PrimaryButton
                        className={styles.primaryButton}
                        disabled={!newValues?.trim()}
                        title=""
                        text="REPLACE"
                        onClick={onSubmit}
                    />
                )}
            </div>
        </>
    );
}
