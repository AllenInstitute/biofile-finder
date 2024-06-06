import {
    IDetailsRowProps,
    createTheme,
    IColumn,
    IRenderFunction,
    SelectionMode,
    ThemeProvider,
    PartialTheme,
} from "@fluentui/react";
import { ShimmeredDetailsList } from "@fluentui/react/lib/ShimmeredDetailsList";
import * as React from "react";

import { columns } from "./DatasetColumns";
import DatasetRow from "./DatasetRow";
import useDatasetDetails from "./useDatasetDetails";
import FileFilter from "../../../../core/entity/FileFilter";
import { PublicDatasetProps } from "../../entity/PublicDataset";

import styles from "./DatasetTable.module.css";

interface DatasetTableProps {
    filters?: FileFilter[];
}

export default function DatasetTable(props: DatasetTableProps) {
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
        return fieldContent;
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
                        root: styles.shimmer,
                        contentWrapper: styles.tableContent,
                    }}
                    onRenderRow={(props, defaultRender) => renderRow(props, defaultRender)}
                    onRenderItemColumn={renderItemColumn}
                    removeFadingOverlay
                    shimmerLines={1}
                    styles={{
                        root: styles.shimmer,
                    }}
                ></ShimmeredDetailsList>
            </ThemeProvider>
            {(!items || items?.length == 0) && (
                <div className={styles.errorMessage}>No datasets found</div>
            )}
            {error && <div className={styles.errorMessage}>{error}</div>}
        </div>
    );
}
