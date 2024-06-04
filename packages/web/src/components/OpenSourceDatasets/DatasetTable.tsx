import { IDetailsRowProps, IListProps, IRenderFunction, SelectionMode } from "@fluentui/react";
import { ShimmeredDetailsList } from "@fluentui/react/lib/ShimmeredDetailsList";
import * as React from "react";

import { columns } from "./DatasetColumns";
import DatasetRow from "./DatasetRow";
import useDatasetDetails from "./useDatasetDetails";

import styles from "./DatasetTable.module.css";

export default function DatasetTable() {
    const [datasetDetails] = useDatasetDetails();
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
    const shimmeredDetailsListProps: IListProps = {
        renderedWindowsAhead: 0,
        renderedWindowsBehind: 0,
    };

    return (
        <>
            <ShimmeredDetailsList
                setKey="items"
                items={items || []}
                columns={columns}
                isHeaderVisible={true}
                className={styles.table}
                selectionMode={SelectionMode.none}
                enableShimmer={false}
                ariaLabelForShimmer="Content is being fetched"
                ariaLabelForGrid="Item details"
                detailsListStyles={{
                    headerWrapper: styles.tableHeader,
                    root: styles.table,
                    contentWrapper: styles.tableContent,
                }}
                listProps={shimmeredDetailsListProps}
                onRenderRow={(props, defaultRender) => renderRow(props, defaultRender)}
                shimmerLines={5}
                styles={{
                    root: styles.shimmer,
                }}
            ></ShimmeredDetailsList>
        </>
    );
}
