import classNames from "classnames";
import { get as _get } from "lodash";
import * as React from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

import DatasetDetailsRow from "./DatasetDetailsRow";
import { selection } from "../../../../core/state";
import {
    PrimaryButton,
    SecondaryButton,
    TertiaryButton,
} from "../../../../core/components/Buttons";
import Annotation from "../../../../core/entity/Annotation";
import { getNameAndTypeFromSourceUrl, Source } from "../../../../core/entity/FileExplorerURL";
import { DataSource } from "../../../../core/services/DataSourceService";

import styles from "./DatasetDetails.module.css";

interface Props {
    dataset: DataSource;
    onDismiss: () => void;
}

const relatedPublicationKey: keyof DataSource = "publication";
const doiKey: keyof DataSource = "doi";
export const DATASET_DISPLAY_FIELDS: { display: string; key: keyof DataSource }[] = [
    {
        display: "Creation date",
        key: "creationDate",
    },
    {
        display: "Related publication",
        key: "publication",
    },
    {
        display: "Size",
        key: "size",
    },
    {
        display: "Publication date",
        key: "publicationDate",
    },
    {
        display: "File count",
        key: "count",
    },
    {
        display: "DOI",
        key: "doi",
    },
];

/**
 * Component responsible for displaying a pane containing the given
 * dataset's details.
 */
export default function DatasetDetails(props: Props) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [showLongDescription, setShowLongDescription] = React.useState(false);
    const isLongDescription = props.dataset.description.length > 280;

    const content: JSX.Element | JSX.Element[] | null = React.useMemo(() => {
        return DATASET_DISPLAY_FIELDS.reduce((accum, field) => {
            // Default to still display field, just indicate no value provided
            const datasetFieldValue = _get(
                props.dataset,
                field.key,
                Annotation.MISSING_VALUE
            ) as string;
            return [
                ...accum,
                <DatasetDetailsRow
                    key={field.display}
                    className={styles.row}
                    name={field.display}
                    value={datasetFieldValue}
                    link={
                        datasetFieldValue &&
                        (field.key === relatedPublicationKey || field.key === doiKey) &&
                        props.dataset.doi
                            ? props.dataset.doi
                            : undefined
                    }
                />,
            ];
        }, [] as JSX.Element[]);
    }, [props.dataset]);

    const openDatasetInApp = (source: Source) => {
        navigate("/app");
        dispatch(
            selection.actions.addQuery({
                name: `New ${source.name} Query on ${props.dataset.name}`,
                parts: { sources: [source] },
            })
        );
    };

    const loadDataset = () => {
        const dataSourceURL = props.dataset.uri as string;
        if (!dataSourceURL) throw new Error("No path provided to dataset");
        const { name, extensionGuess } = getNameAndTypeFromSourceUrl(dataSourceURL);
        openDatasetInApp({
            name,
            type: extensionGuess as "csv" | "json" | "parquet",
            uri: dataSourceURL,
        });
    };

    const toggleDescriptionButton = (
        <a className={styles.link} onClick={() => setShowLongDescription(!showLongDescription)}>
            Read {showLongDescription ? "less" : "more"}
        </a>
    );

    return (
        <div className={styles.panel}>
            <div className={styles.internalWrapper}>
                <TertiaryButton
                    className={styles.closeButton}
                    iconName="Cancel"
                    title="Close"
                    onClick={props.onDismiss}
                />
                <div className={styles.title}>{props.dataset.name}</div>
                <PrimaryButton
                    className={styles.button}
                    iconName="Upload"
                    title="Load dataset"
                    text="LOAD DATASET"
                    onClick={loadDataset}
                />
                <hr></hr>
                <div className={styles.content}>
                    <div
                        className={classNames({
                            [styles.descriptionTruncated]:
                                !showLongDescription && isLongDescription,
                        })}
                    >
                        {props.dataset.description}
                    </div>
                    {isLongDescription && toggleDescriptionButton}
                    <div className={styles.list}>{content}</div>
                    <SecondaryButton
                        className={styles.secondaryCloseButton}
                        title="Close panel"
                        text="CLOSE"
                        onClick={props.onDismiss}
                    />
                </div>
            </div>
        </div>
    );
}
