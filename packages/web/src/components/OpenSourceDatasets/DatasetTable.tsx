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
import useDatasetDetails from "./useDatasetDetails";
import PublicDataset, {
    PublicDatasetProps,
    DATASET_TABLE_FIELDS,
    DatasetAnnotations,
} from "../../entity/PublicDataset";
import FileFilter from "../../../../core/entity/FileFilter";
import FileSort, { SortOrder } from "../../../../core/entity/FileSort";

import styles from "./DatasetTable.module.css";

interface DatasetTableProps {
    filters?: FileFilter[];
    onLoadDataset: (dataset: PublicDataset) => void;
}

export default function DatasetTable(props: DatasetTableProps) {
    const [sortColumn, setSortColumn] = React.useState<FileSort | undefined>(undefined);
    const columns = DATASET_TABLE_FIELDS.map(
        (value, index): IColumn => {
            return {
                key: `column${index}`,
                name: value.displayLabel.toUpperCase(),
                fieldName: value.name,
                isResizable: true,
                minWidth: value?.minWidth,
                isSorted: sortColumn?.annotationName == value.displayLabel,
                isSortedDescending: sortColumn?.order == SortOrder.DESC,
                onColumnClick: () => onColumnClick(value.displayLabel),
            };
        }
    );
    const [datasetDetails, isLoading, error] = useDatasetDetails(props?.filters || [], sortColumn);
    const items = React.useMemo(() => {
        return datasetDetails?.map((detail) => detail.details);
    }, [datasetDetails]);

    const renderRow = (
        rowProps: IDetailsRowProps | undefined,
        defaultRender: IRenderFunction<IDetailsRowProps> | undefined
    ): JSX.Element => {
        if (rowProps && defaultRender) {
            return (
                <DatasetRow
                    rowProps={rowProps}
                    defaultRender={defaultRender}
                    onLoadDataset={props.onLoadDataset}
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
        item: PublicDatasetProps,
        _: number | undefined,
        column: IColumn | undefined
    ) {
        const fieldContent = item[column?.fieldName as keyof PublicDatasetProps] as string;
        if (!fieldContent) return <>--</>;
        if (
            column?.fieldName === DatasetAnnotations.RELATED_PUBLICATON.name &&
            (item?.related_publication_link || item?.doi)
        ) {
            return (
                <a
                    className={classNames(styles.link, styles.doubleLine)}
                    href={item.related_publication_link || item.doi}
                    target="_blank"
                    rel="noopener noreferrer"
                >
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
                    items={items || []}
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
            {!isLoading && (!items || items?.length == 0) && (
                <div className={styles.errorMessage}>No datasets found</div>
            )}
            {error && <div className={styles.errorMessage}>{error}</div>}
        </div>
    );
}
