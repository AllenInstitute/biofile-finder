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
import * as React from "react";

import rootStyles from "./EditMetadata.module.css";
import styles from "./MetadataDetails.module.css";

export interface ValueCountItem {
    value: string | undefined;
    fileCount: number;
}

interface DetailsListProps {
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

    function renderItemColumn(
        item: ValueCountItem,
        _: number | undefined,
        column: IColumn | undefined
    ) {
        const fieldContent = item[column?.fieldName as keyof ValueCountItem] as string;
        if (!fieldContent) return "[No value] (blank)";
        if (column?.fieldName === "fileCount") {
            return <div className={styles.columnRightAlignCell}>{fieldContent}</div>;
        }
        return fieldContent;
    }

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
                    {/* TODO: Display different entry types depending on datatype of annotation */}
                    <TextField
                        label="Replace with"
                        className={rootStyles.textField}
                        onBlur={(e) =>
                            e.currentTarget.value && props.onChange(e.currentTarget.value)
                        }
                        placeholder="Value(s)"
                        defaultValue={props.newValues}
                    />
                </StackItem>
            </Stack>
        </div>
    );
}
