import * as React from "react";
import DatasetTable from "./DatasetTable";
import styles from "./OpenSourceDatasets.module.css";

/**
 * Page for displaying public-facing datasets
 * Currently using placeholder text and data
 */
export default function OpenSourceDatasets() {
    return (
        <div className={styles.root}>
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
                    Datasets from the Allen Institute for Cell Science
                </div>
                <DatasetTable />
                <div className={styles.tableHeader}>Additional contributed datasets</div>
                <DatasetTable />
            </div>
        </div>
    );
}
