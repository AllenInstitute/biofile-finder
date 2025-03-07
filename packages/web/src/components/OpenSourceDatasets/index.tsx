import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import DatasetTable from "./DatasetTable";
import DatasetDetails from "../DatasetDetails";
import { DatasetManifestUrl } from "../../constants";
import PublicDataset, { DatasetAnnotations } from "../../entity/PublicDataset";
import { metadata, selection } from "../../../../core/state";
import FileFilter from "../../../../core/entity/FileFilter";

import styles from "./OpenSourceDatasets.module.css";
import {
    SearchParamsComponents,
    getNameAndTypeFromSourceUrl,
    Source,
} from "../../../../core/entity/SearchParams";

/**
 * Page for displaying public-facing datasets
 * Currently using placeholder text and data
 */
export default function OpenSourceDatasets() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const currentGlobalURL = useSelector(selection.selectors.getEncodedSearchParams);

    // Begin request action so dataset manifest is ready for table child component
    React.useEffect(() => {
        dispatch(
            metadata.actions.requestDatasetManifest(
                "Dataset Manifest",
                DatasetManifestUrl.PRODUCTION
            )
        );
    }, [dispatch]);

    const openDatasetInApp = (
        datasetName: string,
        source: Source,
        url?: Partial<SearchParamsComponents>
    ) => {
        dispatch(
            selection.actions.addQuery({
                name: `New ${source.name} Query on ${datasetName || "open-source dataset"}`,
                parts: { ...url, sources: [source] },
            })
        );
        navigate({
            pathname: "/app",
            search: `?${currentGlobalURL}`,
        });
    };

    const loadDataset = (datasetDetails?: PublicDataset) => {
        if (!datasetDetails) throw new Error("No dataset provided");

        const dataSourceURL = datasetDetails.path;
        const url = datasetDetails?.presetQuery;
        openDatasetInApp(
            datasetDetails.name,
            {
                ...getNameAndTypeFromSourceUrl(dataSourceURL),
                uri: dataSourceURL,
            },
            url
        );
    };

    const internalDatasetFilter = new FileFilter(
        DatasetAnnotations.SOURCE.displayLabel,
        "internal"
    );
    const externalDatasetFilter = new FileFilter(
        DatasetAnnotations.SOURCE.displayLabel,
        "external"
    );

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
                    <DatasetTable filters={[internalDatasetFilter]} onLoadDataset={loadDataset} />
                    <div className={styles.tableTitle}>Additional contributed datasets</div>
                    <DatasetTable filters={[externalDatasetFilter]} onLoadDataset={loadDataset} />
                    <p>
                        Want to include your dataset? Send us a request on
                        <a
                            className={styles.link}
                            href="https://github.com/AllenInstitute/biofile-finder/issues"
                            target="_blank"
                            rel="noreferrer"
                        >
                            &nbsp;our GitHub page&nbsp;
                        </a>
                        and we can see about including your data. Please note that your image data
                        would need to be stored in a public location like
                        <a
                            className={styles.link}
                            href="https://idr.openmicroscopy.org/"
                            target="_blank"
                            rel="noreferrer"
                        >
                            &nbsp;the Image Data Resource&nbsp;
                        </a>{" "}
                        or AWS.
                    </p>
                </div>
            </div>
            <DatasetDetails onLoadDataset={loadDataset} />
        </>
    );
}
