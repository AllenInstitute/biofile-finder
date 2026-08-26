import { get as _get } from "lodash";
import * as React from "react";
import { useSelector } from "react-redux";

import PublicDataset, {
    DATASET_DISPLAY_FIELDS,
    DatasetAnnotations,
} from "../../entity/PublicDataset";
import { interaction } from "../../../../core/state";
import { PrimaryButton, SecondaryButton } from "../../../../core/components/Buttons";
import DatasetDetailsPanel, {
    DatasetDetail,
} from "../../../../core/components/DatasetDetailsPanel";

import styles from "./OpenSourceDatasetDetails.module.css";

interface DatasetDetailsProps {
    onLoadDataset: (datasetDetails: PublicDataset | undefined) => void;
}

/***
 * Wrapper of the DatasetDetailsPanel, used for our open source datasets page.
 * Converts `PublicDataset`s into the array structure that that the panel expects,
 * and adds buttons for downloading the dataset file and for viewing it in the app
 */
export default function PublicDatasetDetails(props: DatasetDetailsProps) {
    const datasetDetails: PublicDataset | undefined = useSelector(
        interaction.selectors.getSelectedPublicDataset
    );

    const content: DatasetDetail[] | undefined = React.useMemo(() => {
        if (!datasetDetails) {
            return undefined;
        }

        return DATASET_DISPLAY_FIELDS.reduce((accum, field) => {
            const fieldName = field.name;
            let datasetFieldValue;
            let link;
            if (datasetDetails.details.hasOwnProperty(fieldName)) {
                datasetFieldValue = _get(datasetDetails.details, fieldName);
                if (
                    fieldName === DatasetAnnotations.DOI.name ||
                    fieldName === DatasetAnnotations.RELATED_PUBLICATON.name
                ) {
                    // Start by using the DOI for both links
                    link = _get(datasetDetails.details, DatasetAnnotations.DOI.name);
                }
                if (
                    fieldName === DatasetAnnotations.RELATED_PUBLICATON.name &&
                    datasetDetails.details.hasOwnProperty(
                        DatasetAnnotations.RELATED_PUBLICATION_LINK.name
                    )
                ) {
                    // If RELATED_PUBLICATON has its own link other than the DOI, prioritize that
                    link = _get(
                        datasetDetails.details,
                        DatasetAnnotations.RELATED_PUBLICATION_LINK.name
                    );
                }
            } else datasetFieldValue = "--"; // Still display field, just indicate no value provided
            const ret = [
                ...accum,
                {
                    label: field.displayLabel,
                    value: datasetFieldValue,
                    link: link || undefined,
                },
            ];
            return ret;
        }, [] as DatasetDetail[]);
    }, [datasetDetails]);

    return (
        <DatasetDetailsPanel
            className={styles.datasetPanel}
            datasetDetails={content}
            title={datasetDetails?.name}
            description={datasetDetails?.description}
        >
            <div className={styles.buttonWrapper}>
                <PrimaryButton
                    className={styles.button}
                    iconName="View"
                    title="View dataset in the app"
                    text="VIEW"
                    onClick={() => props.onLoadDataset(datasetDetails)}
                />
                <a href={datasetDetails?.path} target="_blank" rel="noreferrer">
                    <SecondaryButton
                        className={styles.button}
                        iconName="Download"
                        title="Download dataset"
                        text="DOWNLOAD"
                    />
                </a>
            </div>
        </DatasetDetailsPanel>
    );
}
