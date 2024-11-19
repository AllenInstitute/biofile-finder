import { IComboBoxOption } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import MetadataDetails, { ValueCountItem } from "./MetadataDetails";
import { PrimaryButton, SecondaryButton } from "../Buttons";
import ComboBox from "../ComboBox";

import styles from "./EditMetadata.module.css";

interface ExistingAnnotationProps {
    onDismiss: () => void;
    annotationValueMap: Map<string, any> | undefined;
    annotationOptions: { key: string; text: string }[];
    selectedFileCount: number;
}

/**
 * Component for selecting an existing annotation
 * and then entering values for the selected files
 */
export default function ExistingAnnotationPathway(props: ExistingAnnotationProps) {
    const [newValues, setNewValues] = React.useState<string>();
    const [valueCount, setValueCount] = React.useState<ValueCountItem[]>();

    const onSelectMetadataField = (
        option: IComboBoxOption | undefined,
        value: string | undefined
    ) => {
        let valueMap: ValueCountItem[] = [];
        // FluentUI's combobox doesn't always register the entered value as an option,
        // so we need to be able to check both
        const selectedFieldName = option?.text || value;
        if (!selectedFieldName) return;
        // Track how many values we've seen, since some files may not have a value for this field
        let totalValueCount = 0;
        if (props?.annotationValueMap?.has(selectedFieldName)) {
            const fieldValues = props.annotationValueMap.get(selectedFieldName);
            valueMap = Object.keys(fieldValues).map((fieldName) => {
                totalValueCount += fieldValues[fieldName];
                return {
                    value: fieldName,
                    fileCount: fieldValues[fieldName],
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
        setValueCount(valueMap);
    };

    function onSubmit() {
        // TO DO: endpoint logic is in progress on a different branch
        props.onDismiss();
    }

    return (
        <>
            <ComboBox
                className={styles.comboBox}
                label="Select a metadata field"
                placeholder="Select a field"
                options={props.annotationOptions}
                useComboBoxAsMenuWidth
                onChange={onSelectMetadataField}
            />
            {valueCount && (
                <MetadataDetails
                    onChange={(value) => setNewValues(value)}
                    items={valueCount || []}
                />
            )}
            <div className={classNames(styles.footer, styles.footerAlignRight)}>
                <SecondaryButton title="Cancel" text="CANCEL" onClick={props.onDismiss} />
                <PrimaryButton
                    className={styles.primaryButton}
                    disabled={!newValues}
                    title="Replace"
                    text="REPLACE"
                    onClick={onSubmit}
                />
            </div>
        </>
    );
}
