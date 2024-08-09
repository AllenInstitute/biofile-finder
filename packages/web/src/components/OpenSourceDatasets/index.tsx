import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import DatasetTable from "./DatasetTable";
import DatasetDetails from "../DatasetDetails";
import { metadata } from "../../../../core/state";
import { DataSource } from "../../../../core/services/DataSourceService";

import styles from "./OpenSourceDatasets.module.css";

/**
 * Page for displaying public-facing datasets
 * Currently using placeholder text and data
 */
export default function OpenSourceDatasets() {
    const dispatch = useDispatch();
    const publicDataSources = useSelector(metadata.selectors.getDataSources);

    const [selectedDataset, setSelectedDataset] = React.useState<DataSource>();

    // Fetch public dataset list
    React.useEffect(() => {
        dispatch(metadata.actions.requestDataSources());
    }, [dispatch]);

    const internalDataSources = publicDataSources
        ? publicDataSources.filter((dataSource) => dataSource.source === "internal")
        : [];
    const externalDataSources = publicDataSources
        ? publicDataSources.filter((dataSource) => dataSource.source === "external")
        : [];

    return (
        <>
            <div className={styles.scroll}>
                <div className={styles.banner}>
                    <div className={styles.bannerContent}>
                        <div className={styles.bannerContentText}>
                            <div className={styles.bannerHeader}> Open-source datasets</div>
                            <div className={styles.bannerBody}>
                                The tables below contain examples of internally (AICS) and
                                externally contributed datasets that are available for exploration.
                            </div>
                            <div className={styles.bannerBody}>
                                Select a dataset to view more information, or click LOAD to open it
                                in the BioFile Finder app.
                            </div>
                        </div>
                    </div>
                </div>
                <div className={styles.content}>
                    <div className={styles.tableTitle}>
                        Datasets from the Allen Institute for Cell Science
                    </div>
                    <DatasetTable rows={internalDataSources} onSelect={setSelectedDataset} />
                    <div className={styles.tableTitle}>Additional contributed datasets</div>
                    <DatasetTable rows={externalDataSources} onSelect={setSelectedDataset} />
                </div>
            </div>
            {selectedDataset && (
                <DatasetDetails
                    dataset={selectedDataset}
                    onDismiss={() => setSelectedDataset(undefined)}
                />
            )}
        </>
    );
}
