import { DefaultButton, IconButton } from "@fluentui/react";
import classNames from "classnames";
import { get as _get } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import DatasetDetailsRow from "./DatasetDetailsRow";
import PublicDataset, {
    DATASET_DISPLAY_FIELDS,
    DatasetAnnotations,
} from "../../entity/PublicDataset";
import { interaction, selection } from "../../../../core/state";
import { getNameAndTypeFromSourceUrl, Source } from "../../../../core/entity/FileExplorerURL";

import styles from "./DatasetDetails.module.css";

export default function DatasetDetails() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
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
                    (fieldName === DatasetAnnotations.RELATED_PUBLICATON.name ||
                        fieldName === DatasetAnnotations.DOI.name) &&
                    datasetDetails.details.hasOwnProperty(DatasetAnnotations.DOI.name)
                )
                    link = _get(datasetDetails.details, DatasetAnnotations.DOI.name);
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

    const openDatasetInApp = (source: Source) => {
        navigate("/app");
        dispatch(
            selection.actions.addQuery({
                name: `New ${source.name} Query on ${
                    datasetDetails?.name || "open-source dataset"
                }`,
                parts: { source },
            })
        );
    };

    const loadDataset = () => {
        const dataSourceURL = datasetDetails?.path;
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
        <div
            className={classNames(styles.panel, {
                [styles.hidden]: !isDetailsPanelVisible,
            })}
        >
            <div className={styles.internalWrapper}>
                <IconButton
                    ariaLabel="Close"
                    className={styles.closeButton}
                    iconProps={{ iconName: "Cancel" }}
                    onClick={() => dispatch(interaction.actions.hideDatasetDetailsPanel())}
                />
                <div className={styles.title}>{datasetDetails?.name}</div>
                <DefaultButton
                    className={classNames(styles.button)}
                    styles={{
                        label: styles.buttonLabel,
                        icon: styles.buttonIcon,
                    }}
                    ariaLabel="Load dataset"
                    iconProps={{ iconName: "Upload" }}
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
                        {datasetDetails?.description}
                    </div>
                    {isLongDescription && toggleDescriptionButton}
                    <div className={styles.list}>{content}</div>
                    <DefaultButton
                        className={styles.secondaryCloseButton}
                        ariaLabel="Close panel"
                        styles={{ label: styles.secondaryCloseButtonLabel }}
                        title="Close panel"
                        text="CLOSE"
                        onClick={() => dispatch(interaction.actions.hideDatasetDetailsPanel())}
                    />
                </div>
            </div>
        </div>
    );
}
