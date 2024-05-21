import { DetailsList, IDetailsRowProps, IRenderFunction, SelectionMode } from "@fluentui/react";
import * as React from "react";

import { datasetList } from "./DatasetRows";
import { columns } from "./DatasetColumns";

import styles from "./DatasetTable.module.css";

export default function DatasetTable() {
    // const rowHeight = 52

    const renderRow = (
        rowProps: IDetailsRowProps | undefined,
        defaultRender: IRenderFunction<IDetailsRowProps> | undefined
    ): JSX.Element => {
        if (rowProps && defaultRender) {
            return <div className={styles.tableContent}>{defaultRender({ ...rowProps })}</div>;
        }
        return <></>;
    };

    /**
     * TODO: Create modal
     * On hover, show buttons
     * On click, show modal
     * */
    return (
        <>
            <DetailsList
                items={datasetList}
                columns={columns}
                isHeaderVisible={true}
                className={styles.table}
                selectionMode={SelectionMode.none}
                styles={{
                    headerWrapper: styles.tableHeader,
                    root: styles.table,
                    contentWrapper: styles.tableContent,
                }}
                onRenderRow={(props, defaultRender) => renderRow(props, defaultRender)}
            ></DetailsList>
        </>
    );
}
