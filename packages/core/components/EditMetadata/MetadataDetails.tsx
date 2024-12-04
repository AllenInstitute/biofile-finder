import {
    DatePicker,
    DetailsList,
    IColumn,
    Icon,
    IDetailsRowProps,
    IRenderFunction,
    SelectionMode,
    Stack,
    StackItem,
    TextField,
} from "@fluentui/react";
import * as React from "react";

import ChoiceGroup from "../ChoiceGroup";
import DurationForm from "../DurationForm";
import NumberField from "../NumberRangePicker/NumberField";
import annotationFormatterFactory, { AnnotationType } from "../../entity/AnnotationFormatter";

import rootStyles from "./EditMetadata.module.css";
import styles from "./MetadataDetails.module.css";

export interface ValueCountItem {
    value: string | undefined;
    fileCount: number;
}

interface DetailsListProps {
    fieldType?: AnnotationType;
    items: ValueCountItem[];
    onChange: (value: string | undefined) => void;
    newValues?: string;
}

/**
 * Component that displays a table of the current values for the selected annotation
 * and provides an field for user to input new values.
 * Used by both the new & existing annotation pathways
 */
export default function EditMetadataDetailsList(props: DetailsListProps) {
    const { items } = props;
    const renderRow = (
        rowProps: IDetailsRowProps | undefined,
        defaultRender: IRenderFunction<IDetailsRowProps> | undefined
    ): JSX.Element => {
        if (rowProps && defaultRender) {
            return <span className={styles.tableRow}>{defaultRender(rowProps)}</span>;
        }
        return <></>;
    };
    const annotationFormatter = annotationFormatterFactory(
        props.fieldType || AnnotationType.STRING
    );

    function renderItemColumn(
        item: ValueCountItem,
        _: number | undefined,
        column: IColumn | undefined
    ) {
        const fieldContent = item[column?.fieldName as keyof ValueCountItem] as string;
        if (column?.fieldName === "value") {
            if (!fieldContent) return "[No value] (blank)";
            else return annotationFormatter.displayValue(fieldContent);
        } else if (column?.fieldName === "fileCount") {
            return <div className={styles.columnRightAlignCell}>{fieldContent}</div>;
        }
        return fieldContent;
    }

    const inputField = () => {
        switch (props.fieldType) {
            case AnnotationType.DATE:
            case AnnotationType.DATETIME:
                return (
                    <DatePicker
                        styles={{
                            root: styles.dateRangeRoot,
                            readOnlyPlaceholder: styles.readOnlyPlaceholder,
                            textField: styles.dateRangeTextField,
                        }}
                        placeholder={"Select a date"}
                    />
                );
            case AnnotationType.NUMBER:
                return (
                    <NumberField
                        aria-label="Input a numerical value"
                        id="numInput"
                        placeholder="Enter value..."
                        onChange={() => {
                            console.info("placeholder for linting");
                        }}
                    />
                );
            case AnnotationType.BOOLEAN:
                return (
                    <ChoiceGroup
                        className={rootStyles.choiceGroup}
                        defaultSelectedKey={"true"}
                        onChange={() => {
                            console.info("placeholder");
                        }}
                        options={[
                            {
                                key: "true",
                                text: "True",
                            },
                            {
                                key: "false",
                                text: "False",
                            },
                        ]}
                    />
                );
            case AnnotationType.DURATION:
                return (
                    <DurationForm
                        onChange={(totalDuration: number) => console.info(totalDuration)}
                    />
                );
            case AnnotationType.DROPDOWN:
            case AnnotationType.STRING:
            default:
                return (
                    <TextField
                        className={rootStyles.textField}
                        onBlur={(e) =>
                            e.currentTarget.value && props.onChange(e.currentTarget.value)
                        }
                        placeholder="Value(s)"
                        defaultValue={props.newValues}
                    />
                );
        }
    };

    return (
        <div className={styles.wrapper}>
            <Stack className={styles.stack} horizontal tokens={{ childrenGap: 20 }}>
                <StackItem grow className={styles.stackItemLeft}>
                    <h4 className={styles.tableTitle}>Existing values</h4>
                    <DetailsList
                        setKey="items"
                        cellStyleProps={{
                            cellLeftPadding: 0,
                            cellRightPadding: 5,
                            cellExtraRightPadding: 0,
                        }}
                        styles={{
                            headerWrapper: styles.detailsHeader,
                        }}
                        items={items}
                        selectionMode={SelectionMode.none}
                        compact
                        columns={[
                            {
                                key: "value",
                                name: "VALUES",
                                minWidth: 100,
                                fieldName: "value",
                            },
                            {
                                key: "fileCount",
                                name: "# OF FILES",
                                minWidth: 100,
                                fieldName: "fileCount",
                                styles: {
                                    root: styles.columnRightAlign,
                                },
                            },
                        ]}
                        onRenderRow={(props, defaultRender) => renderRow(props, defaultRender)}
                        onRenderItemColumn={renderItemColumn}
                    />
                </StackItem>
                <StackItem grow align="center" className={styles.stackItemCenter}>
                    <Icon iconName="Forward" />
                </StackItem>
                <StackItem grow className={styles.stackItemRight}>
                    <h4 className={styles.tableTitle}>Replace with</h4>
                    {inputField()}
                </StackItem>
            </Stack>
        </div>
    );
}
