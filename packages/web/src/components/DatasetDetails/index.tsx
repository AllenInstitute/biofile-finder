import classNames from "classnames";
import { get as _get } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import DatasetDetailsRow from "./DatasetDetailsRow";
import PublicDataset, {
    DATASET_DISPLAY_FIELDS,
    DatasetAnnotations,
} from "../../entity/PublicDataset";
import { interaction } from "../../../../core/state";
import {
    PrimaryButton,
    SecondaryButton,
    TertiaryButton,
} from "../../../../core/components/Buttons";

import styles from "./DatasetDetails.module.css";

interface DatasetDetailsProps {
    onLoadDataset: (datasetDetails: PublicDataset | undefined) => void;
}

export default function DatasetDetails(props: DatasetDetailsProps) {
    const dispatch = useDispatch();
    const isDetailsPanelVisible = useSelector(interaction.selectors.getDatasetDetailsVisibility);
    const datasetDetails: PublicDataset | undefined = useSelector(
        interaction.selectors.getSelectedPublicDataset
    );
    const [showLongDescription, setShowLongDescription] = React.useState(false);
    const isLongDescription: boolean = React.useMemo(() => {
        if (!datasetDetails) {
            return false;
        }
        // Allow slightly longer than 5 lines
        return datasetDetails.description.length > 280;
    }, [datasetDetails]);

    const content: JSX.Element | JSX.Element[] | null = React.useMemo(() => {
        if (!datasetDetails) {
            return null;
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
                <DatasetDetailsRow
                    key={field.displayLabel}
                    className={styles.row}
                    name={field.displayLabel}
                    value={datasetFieldValue}
                    link={link || undefined}
                />,
            ];
            return ret;
        }, [] as JSX.Element[]);
    }, [datasetDetails]);

    const toggleDescriptionButton = (
        <a className={styles.link} onClick={() => setShowLongDescription(!showLongDescription)}>
            Read {showLongDescription ? "less" : "more"}
        </a>
    );

    return (
        <div
            className={classNames(styles.panel, {
                [styles.hidden]: !isDetailsPanelVisible,
            })}
        >
            <div className={styles.internalWrapper}>
                <div className={styles.header}>
                    <TertiaryButton
                        iconName="Cancel"
                        title="Close"
                        onClick={() => dispatch(interaction.actions.hideDatasetDetailsPanel())}
                    />
                </div>
                <div className={styles.title}>{datasetDetails?.name}</div>
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
                <hr></hr>
                <div className={styles.content}>
                    <div
                        className={classNames({
                            [styles.descriptionTruncated]:
                                !showLongDescription && isLongDescription,
                        })}
                    >
                        {datasetDetails?.description}
                    </div>
                    {isLongDescription && toggleDescriptionButton}
                    <div className={styles.list}>{content}</div>
                    <div className={styles.footer}>
                        <SecondaryButton
                            className={styles.secondaryCloseButton}
                            title="Close panel"
                            text="CLOSE"
                            onClick={() => dispatch(interaction.actions.hideDatasetDetailsPanel())}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
