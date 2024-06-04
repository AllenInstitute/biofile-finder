import * as React from "react";
import { useDispatch } from "react-redux";

import DatasetTable from "./DatasetTable";
import DatasetDetails from "../DatasetDetails";
import { DatasetManifestUrl } from "../../constants";
import { metadata } from "../../../../core/state";

import styles from "./OpenSourceDatasets.module.css";

/**
 * Page for displaying public-facing datasets
 * Currently using placeholder text and data
 */
export default function OpenSourceDatasets() {
    const dispatch = useDispatch();
    // Begin update action so dataset manifest is ready for table child component
    dispatch(
        metadata.actions.updateDatasetManifest("Dataset Manifest", DatasetManifestUrl.PRODUCTION)
    );

    return (
        <>
            <div className={styles.scroll}>
                <div className={styles.banner}>
                    <div className={styles.bannerContent}>
                        <div className={styles.bannerContentText}>
                            <div className={styles.bannerHeader}> Open-source datasets</div>
                            <div className={styles.bannerBody}>
                                This is a paragraph about the table of datasets below
                            </div>
                            <div className={styles.bannerBody}>
                                This is a second paragraph about how to learn about how to use our
                                datasets, directing users to an eventual <a>Learn</a> page.
                            </div>
                        </div>
                    </div>
                </div>
                <div className={styles.content}>
                    <div className={styles.tableHeader}>
                        Datasets from the Allen Institute {/* for Cell Science */}
                    </div>
                    <DatasetTable />
                    {/* TODO: Conditionally render additional datasets */}
                    {/* <div className={styles.tableHeader}>Additional contributed datasets</div>
                    <DatasetTable /> */}
                </div>
            </div>
            <DatasetDetails />
        </>
    );
}
