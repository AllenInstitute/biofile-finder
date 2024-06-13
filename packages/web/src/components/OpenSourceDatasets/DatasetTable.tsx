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
import * as React from "react";

import DatasetRow from "./DatasetRow";
import useDatasetDetails from "./useDatasetDetails";
import { PublicDatasetProps, DATASET_TABLE_FIELDS } from "../../entity/PublicDataset";
import FileFilter from "../../../../core/entity/FileFilter";

import styles from "./DatasetTable.module.css";

interface DatasetTableProps {
    filters?: FileFilter[];
}

export default function DatasetTable(props: DatasetTableProps) {
    // const [sortColumn, setSortColumn] = React.useState<FileSort | null>(null);
    const columns = DATASET_TABLE_FIELDS.map(
        (value, index): IColumn => {
            return {
                key: `column${index}`,
                name: value.displayLabel.toUpperCase(),
                fieldName: value.name,
                isResizable: true,
                minWidth: value?.minWidth,
                // onColumnClick: () => onColumnClick(value.displayLabel),
            };
        }
    );
    const [datasetDetails, isLoading, error] = useDatasetDetails(props?.filters || []);
    const items = datasetDetails?.map((detail) => detail.details);

    const renderRow = (
        rowProps: IDetailsRowProps | undefined,
        defaultRender: IRenderFunction<IDetailsRowProps> | undefined
    ): JSX.Element => {
        if (rowProps && defaultRender) {
            return <DatasetRow rowProps={rowProps} defaultRender={defaultRender} />;
        }
        return <></>;
    };

    // FluentUI does not permit setting ShimmeredDetailsList styles directly, must use themes
    const globalStyle = getComputedStyle(document.body);
    const shimmeredDetailsListTheme: PartialTheme = createTheme({
        semanticColors: {
            disabledBackground: globalStyle.getPropertyValue("--borders-light-grey"),
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
        return <div className={styles.doubleLine}>{fieldContent}</div>;
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
            </ThemeProvider>
            {!isLoading && (!items || items?.length == 0) && (
                <div className={styles.errorMessage}>No datasets found</div>
            )}
            {error && <div className={styles.errorMessage}>{error}</div>}
        </div>
    );
}
