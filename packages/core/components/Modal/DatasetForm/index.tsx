import {
    ChoiceGroup,
    DefaultButton,
    IChoiceGroupOption,
    Icon,
    PrimaryButton,
    TextField,
} from "@fluentui/react";
import classNames from "classnames";
import { isEmpty } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import Annotation from "../../../entity/Annotation";
import { interaction, metadata } from "../../../state";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../../constants";
import AnnotationSelector from "../AnnotationSelector";
import * as modalSelectors from "../selectors";

const styles = require("./DatasetForm.module.css");

export enum Expiration {
    OneDay = "1 Day",
    OneWeek = "1 Week",
    SixMonths = "6 Months",
    OneYear = "1 Year",
    ThreeYears = "3 Years",
    Forever = "Forever",
}
const EXPIRATIONS: IChoiceGroupOption[] = Object.values(Expiration).map((key) => ({
    key,
    text: key,
}));

const DATASET_SUBTITLES = [
    "In order to reproduce your exact selection in Python, we’ll create an immutable, point-in-time snapshot of the metadata for the files you’ve selected (a \"dataset\"). You won't be able to add to or remove from this dataset once created, nor will the files' metadata be modifiable.",
    "In order to reference this dataset, give it a name. If a dataset of that name already exists, we’ll create a new version of that dataset automatically; any previous versions will still be accessible.",
    "Last, select how long to keep this dataset around. If this is being created for a one-off task, consider selecting a shorter lifespan.",
];

/**
 * Dialog form for generating a Python Snippet based on current selection state
 */
export default function DatasetForm({ onDismiss }: ModalProps) {
    const dispatch = useDispatch();

    const existingDatasets = useSelector(metadata.selectors.getDatasets);
    const annotationsPreviouslySelected = useSelector(
        modalSelectors.getAnnotationsPreviouslySelected
    );
    const [selectedAnnotations, setSelectedAnnotations] = React.useState<Annotation[]>(() =>
        isEmpty(annotationsPreviouslySelected)
            ? [...TOP_LEVEL_FILE_ANNOTATIONS]
            : annotationsPreviouslySelected
    );

    // TODO: Pull defaults here
    const [expiration, setExpiration] = React.useState<string>();
    const [dataset, setDataset] = React.useState<string>("");
    const [isDatasetSubtitleExpanded, setIsDatasetSubtitleExpanded] = React.useState(true);

    // Datasets can have the same name with different versions, see if this would
    // need to be a new version based on the name
    const nextVersionForName = React.useMemo(() => {
        const matchingExistingDatasets = existingDatasets
            .filter((d) => d.name === dataset)
            .sort((a, b) => (a.version > b.version ? -1 : 1));
        if (!matchingExistingDatasets.length) {
            return 1;
        }
        return matchingExistingDatasets[0].version + 1;
    }, [dataset, existingDatasets]);

    const onGenerate = () => {
        let expirationDate: Date | undefined = new Date();
        if (expiration === Expiration.OneDay) {
            expirationDate.setDate(expirationDate.getDate() + 1);
        } else if (expiration === Expiration.OneWeek) {
            expirationDate.setDate(expirationDate.getDate() + 7);
        } else if (expiration === Expiration.SixMonths) {
            expirationDate.setMonth(expirationDate.getMonth() + 6);
        } else if (expiration === Expiration.OneYear) {
            expirationDate.setFullYear(expirationDate.getFullYear() + 1);
        } else if (expiration === Expiration.ThreeYears) {
            expirationDate.setFullYear(expirationDate.getFullYear() + 3);
        } else {
            expirationDate = undefined;
        }

        dispatch(
            interaction.actions.generatePythonSnippet(dataset, selectedAnnotations, expirationDate)
        );
    };

    const body = (
        <>
            <h4>Step 1: Dataset Metadata</h4>
            {isDatasetSubtitleExpanded ? (
                <div>
                    {DATASET_SUBTITLES.map((text) => (
                        <p key={text}>{text}</p>
                    ))}
                    <div className={styles.subtitleButtonContainer}>
                        <DefaultButton
                            className={styles.subtitleButton}
                            onClick={() => setIsDatasetSubtitleExpanded(false)}
                        >
                            LESS&nbsp;
                            <Icon iconName="CaretSolidUp" />
                        </DefaultButton>
                    </div>
                </div>
            ) : (
                <div>
                    <div className={styles.subtitle}>{DATASET_SUBTITLES[0] + ".."}</div>
                    <div className={styles.subtitleButtonContainer}>
                        <DefaultButton
                            className={styles.subtitleButton}
                            onClick={() => setIsDatasetSubtitleExpanded(true)}
                        >
                            MORE&nbsp;
                            <Icon iconName="CaretSolidDown" />
                        </DefaultButton>
                    </div>
                </div>
            )}
            <div className={classNames(styles.form, styles.datasetForm)}>
                <ChoiceGroup
                    className={styles.expirationInput}
                    label="Accessible for"
                    selectedKey={expiration}
                    options={EXPIRATIONS}
                    onChange={(_, o) => o && setExpiration(o.key)}
                />
                <div className={styles.nameInput}>
                    <TextField
                        autoFocus
                        label="Name"
                        value={dataset}
                        spellCheck={false}
                        onChange={(_, value) => setDataset(value || "")}
                        placeholder="Enter dataset name..."
                    />
                    {dataset && (
                        <div className={styles.nameInputSubtext}>
                            This will create version {nextVersionForName} for {dataset}.
                        </div>
                    )}
                </div>
            </div>
            <hr />
            {isFixed && (
                <>
                    <h4>Step 2: Select dataframe columns</h4>
                    <p>
                        Select which annotations you would like included as columns in the
                        dataframe.
                    </p>
                    <AnnotationSelector
                        className={styles.form}
                        selections={selectedAnnotations}
                        setSelections={setSelectedAnnotations}
                    />
                </>
            )}
        </>
    );

    return (
        <BaseModal
            body={body}
            footer={
                <PrimaryButton
                    text="Generate"
                    disabled={!selectedAnnotations.length || !dataset || !expiration}
                    onClick={onGenerate}
                />
            }
            onDismiss={onDismiss}
            title="Generate Python Snippet"
        />
    );
}
