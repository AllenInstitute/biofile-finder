import {
    createTheme,
    IColumn,
    IDetailsRowProps,
    IRenderFunction,
    PartialTheme,
    SelectionMode,
    ThemeProvider,
} from "@fluentui/react";
import { ShimmeredDetailsList } from "@fluentui/react/lib/ShimmeredDetailsList";
import classNames from "classnames";
import * as React from "react";

import DatasetRow from "./DatasetRow";
import Annotation from "../../../../core/entity/Annotation";
import FileSort, { SortOrder } from "../../../../core/entity/FileSort";
import { DataSource } from "../../../../core/services/DataSourceService";

import styles from "./DatasetTable.module.css";

interface DatasetTableProps {
    rows?: DataSource[];
    onSelect: (dataset: DataSource) => void;
}

// Limited set used for the table header
interface DatasetColumn {
    display: string;
    key: keyof DataSource;
    minWidth: number;
}
const relatedPublicationKey: keyof DataSource = "publication";
export const DATASET_TABLE_COLUMNS: DatasetColumn[] = [
    {
        display: "Dataset name",
        key: "name",
        minWidth: 50,
    },
    {
        display: "Creation date",
        key: "creationDate",
        minWidth: 112,
    },
    {
        display: "Related publication",
        key: relatedPublicationKey,
        minWidth: 128,
    },
    {
        display: "File count",
        key: "count",
        minWidth: 89,
    },
    {
        display: "Size",
        key: "size",
        minWidth: 78,
    },
    {
        display: "Short description",
        key: "description",
        minWidth: 200,
    },
];

export default function DatasetTable(props: DatasetTableProps) {
    const isLoading = !props.rows;
    const [sortColumn, setSortColumn] = React.useState<FileSort>();

    const sortedRows = sortColumn
        ? props.rows?.sort((a, b) => {
              const aValue = a[sortColumn.annotationName as keyof DataSource] as string;
              const bValue = b[sortColumn.annotationName as keyof DataSource] as string;
              if (aValue === bValue) return 0;
              if (sortColumn.order == SortOrder.ASC) return aValue < bValue ? -1 : 1;
              return aValue > bValue ? -1 : 1;
          })
        : props.rows;

    const columns = DATASET_TABLE_COLUMNS.map(
        (value, index): IColumn => ({
            key: `column${index}`,
            name: value.display.toUpperCase(),
            fieldName: value.key,
            isResizable: true,
            minWidth: value.minWidth,
            isSorted: sortColumn?.annotationName == value.key,
            isSortedDescending: sortColumn?.order == SortOrder.DESC,
            onColumnClick: () => onColumnClick(value.key),
        })
    );

    const renderRow = (
        rowProps: IDetailsRowProps | undefined,
        defaultRender: IRenderFunction<IDetailsRowProps> | undefined
    ): JSX.Element => {
        if (rowProps?.item && defaultRender) {
            return (
                <DatasetRow
                    rowProps={rowProps}
                    defaultRender={defaultRender}
                    onSelect={props.onSelect}
                />
            );
        }
        return <></>;
    };

    // FluentUI does not permit setting ShimmeredDetailsList styles directly, must use themes
    const globalStyle = getComputedStyle(document.body);
    const shimmeredDetailsListTheme: PartialTheme = createTheme({
        semanticColors: {
            disabledBackground: globalStyle.getPropertyValue("--medium-grey"),
            bodyBackground: globalStyle.getPropertyValue("--secondary-dark"),
            bodyDivider: globalStyle.getPropertyValue("--primary-dark"),
        },
    });

    function renderItemColumn(
        item: DataSource,
        _: number | undefined,
        column: IColumn | undefined
    ) {
        if (!column?.fieldName) return <></>;
        const fieldContent = item[column.fieldName as keyof DataSource];
        if (!fieldContent) return <>{Annotation.MISSING_VALUE}</>;
        if (column?.fieldName === relatedPublicationKey && item?.doi) {
            return (
                <a className={classNames(styles.link, styles.doubleLine)} href={item.doi}>
                    {fieldContent}
                </a>
            );
        }
        return <div className={styles.doubleLine}>{fieldContent}</div>;
    }

    function onColumnClick(columnName: string) {
        let sortOrder = SortOrder.ASC;
        if (sortColumn?.annotationName == columnName)
            sortOrder = sortColumn.order == SortOrder.DESC ? SortOrder.ASC : SortOrder.DESC;
        const newSortColumn = new FileSort(columnName, sortOrder);
        setSortColumn(newSortColumn);
    }

    return (
        <div className={styles.table}>
            <ThemeProvider theme={shimmeredDetailsListTheme}>
                <ShimmeredDetailsList
                    setKey="items"
                    items={sortedRows || []}
                    columns={columns}
                    isHeaderVisible={true}
                    selectionMode={SelectionMode.none}
                    enableShimmer={isLoading}
                    ariaLabelForShimmer="Content is being fetched"
                    ariaLabelForGrid="Item details"
                    detailsListStyles={{
                        headerWrapper: styles.tableHeader,
                    }}
                    onRenderRow={(props, defaultRender) => renderRow(props, defaultRender)}
                    onRenderItemColumn={renderItemColumn}
                    removeFadingOverlay
                    shimmerLines={1}
                ></ShimmeredDetailsList>
                <div className={styles.overlay} />
            </ThemeProvider>
            {!isLoading && (!sortedRows || sortedRows?.length == 0) && (
                <div className={styles.errorMessage}>No datasets found</div>
            )}
        </div>
    );
}
