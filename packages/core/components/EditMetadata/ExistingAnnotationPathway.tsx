import { IComboBoxOption } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch } from "react-redux";

import MetadataDetails, { ValueCountItem } from "./MetadataDetails";
import { PrimaryButton, SecondaryButton } from "../Buttons";
import ComboBox from "../ComboBox";
import { interaction } from "../../state";

import styles from "./EditMetadata.module.css";

interface ExistingAnnotationProps {
    onDismiss: () => void;
    annotationValueMap: Map<string, any> | undefined;
    annotationOptions: IComboBoxOption[];
    selectedFileCount: number;
}

/**
 * Component for selecting an existing annotation
 * and then entering values for the selected files
 */
export default function ExistingAnnotationPathway(props: ExistingAnnotationProps) {
    const dispatch = useDispatch();
    const [newValues, setNewValues] = React.useState<string>();
    const [valueCount, setValueCount] = React.useState<ValueCountItem[]>();
    const [selectedAnnotation, setSelectedAnnotation] = React.useState<string | undefined>();

    const onSelectMetadataField = (
        option: IComboBoxOption | undefined,
        value: string | undefined
    ) => {
        let valueMap: ValueCountItem[] = [];
        // FluentUI's combobox doesn't always register the entered value as an option,
        // so we need to be able to check both
        const selectedFieldName = option?.text || value;
        if (
            !selectedFieldName ||
            !props.annotationOptions.some((opt) => opt.key === selectedFieldName)
        )
            return;
        // Track how many values we've seen, since some files may not have a value for this field
        let totalValueCount = 0;
        if (props?.annotationValueMap?.has(selectedFieldName)) {
            const fieldValueToOccurenceMap = props.annotationValueMap.get(selectedFieldName);
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
        setValueCount(valueMap);
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
                placeholder="Select a field"
                selectedKey={selectedAnnotation}
                options={props.annotationOptions}
                useComboBoxAsMenuWidth
                onChange={onSelectMetadataField}
            />
            {!!selectedAnnotation && (
                <MetadataDetails
                    onChange={(value) => setNewValues(value)}
                    items={valueCount || []}
                />
            )}
            <div className={classNames(styles.footer, styles.footerAlignRight)}>
                <SecondaryButton title="" text="CANCEL" onClick={props.onDismiss} />
                {valueCount && (
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
