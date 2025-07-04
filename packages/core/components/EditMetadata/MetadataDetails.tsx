import {
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
import classNames from "classnames";
import * as React from "react";

import ChoiceGroup from "../ChoiceGroup";
import ComboBox from "../ComboBox";
import DateTimePicker from "../DateRangePicker/DateTimePicker";
import DurationForm from "../DurationForm";
import LoadingIcon from "../Icons/LoadingIcon";
import NumberField from "../NumberRangePicker/NumberField";
import annotationFormatterFactory, { AnnotationType } from "../../entity/AnnotationFormatter";

import rootStyles from "./EditMetadata.module.css";
import styles from "./MetadataDetails.module.css";

export interface ValueCountItem {
    value: string | undefined;
    fileCount: number;
}

interface DetailsListProps {
    dropdownOptions?: string[];
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
export default function MetadataDetails(props: DetailsListProps) {
    const { items } = props;
    const isLoading = !items.length;
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
            return <div className={styles.columnRightAlignCell}>{fieldContent || 0}</div>;
        }
        return fieldContent;
    }

    const inputField = () => {
        switch (props.fieldType) {
            case AnnotationType.DATE:
                return (
                    <DateTimePicker
                        placeholder={"Select a date..."}
                        onSelectDate={(date) => props.onChange(date?.toISOString())}
                    />
                );
            case AnnotationType.DATETIME:
                return (
                    <DateTimePicker
                        placeholder={"Select a date..."}
                        onSelectDate={(date) => props.onChange(date?.toISOString())}
                        showTimeSelection
                    />
                );
            case AnnotationType.NUMBER:
                return (
                    <NumberField
                        aria-label="Input a numerical value"
                        id="numInput"
                        placeholder="Type a numerical value..."
                        onChange={(ev) => props.onChange(ev?.target?.value)}
                    />
                );
            case AnnotationType.BOOLEAN:
                return (
                    <ChoiceGroup
                        className={rootStyles.choiceGroup}
                        defaultSelectedKey={"true"}
                        onChange={(_, opt?) => props.onChange(opt?.key)}
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
                    <DurationForm onChange={(duration) => props.onChange(duration.toString())} />
                );
            case AnnotationType.LOOKUP:
            case AnnotationType.DROPDOWN:
                return (
                    <ComboBox
                        className={rootStyles.comboBox}
                        options={(props?.dropdownOptions || []).map((opt) => ({
                            key: opt,
                            text: opt,
                        }))}
                        disabled={!props.dropdownOptions?.length}
                        label=""
                        placeholder="Select value(s)..."
                        onChange={(opt) => props.onChange(opt?.text)}
                    />
                );
            case AnnotationType.STRING:
            default:
                return (
                    <TextField
                        className={classNames(rootStyles.textField, styles.noPadding)}
                        onChange={(e) => props.onChange(e?.currentTarget?.value)}
                        placeholder="Type in value(s)..."
                        defaultValue={props.newValues?.toString()}
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
                    {isLoading && <LoadingIcon invertColor />}
                </StackItem>
                <StackItem grow className={styles.stackItemRight}>
                    <h4 className={styles.valuesTitle}>Replace with</h4>
                    {
                        <div className={styles.inputWrapper}>
                            <Icon iconName="Forward" className={styles.forwardIcon} />
                            {inputField()}
                        </div>
                    }
                </StackItem>
            </Stack>
        </div>
    );
}
