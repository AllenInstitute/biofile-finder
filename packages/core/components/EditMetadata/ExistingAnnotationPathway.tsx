import { IComboBoxOption } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import MetadataDetails, { ValueCountItem } from "./MetadataDetails";
import useAnnotationValueByNameMap from "./useAnnotationValueByNameMap";
import { PrimaryButton, SecondaryButton } from "../Buttons";
import ComboBox from "../ComboBox";
import { TOP_LEVEL_FILE_ANNOTATION_NAMES } from "../../constants";
import { AnnotationType } from "../../entity/AnnotationFormatter";
import { interaction, metadata } from "../../state";

import styles from "./EditMetadata.module.css";

interface ExistingAnnotationProps {
    onDismiss: () => void;
    selectedFileCount: number;
}

const FORBIDDEN_ANNOTATION_NAMES = new Set([...TOP_LEVEL_FILE_ANNOTATION_NAMES]);

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
    const annotationValueByNameMap = useAnnotationValueByNameMap();

    // Don't allow users to edit top level annotations (e.g., File Name)
    const annotationOptions = useSelector(metadata.selectors.getSortedAnnotations)
        .filter((annotation) => !FORBIDDEN_ANNOTATION_NAMES.has(annotation.name))
        .map((annotation) => ({
            key: annotation.name,
            text: annotation.displayName,
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
        setSelectedAnnotation(selectedFieldName);
        setAnnotationType(option?.data);
        setValueCounts(valueMap);
    };

    function onSubmit() {
        if (selectedAnnotation && newValues?.trim()) {
            dispatch(interaction.actions.editFiles({ [selectedAnnotation]: [newValues.trim()] }));
        }
        props.onDismiss();
    }

    return (
        <>
            <ComboBox
                className={styles.comboBox}
                label="Select a metadata field"
                placeholder="Select a field..."
                selectedKey={selectedAnnotation}
                options={annotationOptions}
                onChange={onSelectMetadataField}
            />
            {!!selectedAnnotation && (
                <MetadataDetails
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
