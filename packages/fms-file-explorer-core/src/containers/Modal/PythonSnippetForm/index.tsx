import classNames from "classnames";
import {
    ChoiceGroup,
    DefaultButton,
    IChoiceGroupOption,
    Icon,
    PrimaryButton,
    TextField,
} from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { ModalProps } from "..";
import { interaction, metadata } from "../../../state";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../../constants";
import AnnotationSelector from "../../../components/AnnotationSelector";
import { Dataset } from "../../../services/DatasetService";
import BaseModal from "../BaseModal";

const styles = require("./PythonSnippetForm.module.css");

const TOP_LEVEL_FILE_ANNOTATION_NAMES = TOP_LEVEL_FILE_ANNOTATIONS.map((a) => a.displayName);

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
    "Last, let us know how long to keep this dataset around. If this is being created for a one-off task, consider selecting a shorter lifespan for the dataset.",
];

/**
 * Dialog form for generating a Python Snippet based on current selection state
 */
export default function PythonSnippetForm({ onDismiss }: ModalProps) {
    const dispatch = useDispatch();
    const customAnnotations = useSelector(metadata.selectors.getSortedAnnotations);
    const columnsSavedFromLastTime = useSelector(interaction.selectors.getCsvColumns);
    const datasetService = useSelector(interaction.selectors.getDatasetService);

    const defaultAnnotations = columnsSavedFromLastTime
        ? columnsSavedFromLastTime
        : [...TOP_LEVEL_FILE_ANNOTATION_NAMES];
    const [annotations, setAnnotations] = React.useState<string[]>(defaultAnnotations);
    const [expiration, setExpiration] = React.useState<string>();
    const [dataset, setDataset] = React.useState<string>("");
    const [existingDatasets, setExistingDatasets] = React.useState<Dataset[]>([]);
    const [isDatasetSubtitleExpanded, setIsDatasetSubtitleExpanded] = React.useState(true);

    // Determine the existing datasets to provide some feedback on the input dataset (if any)
    React.useEffect(() => {
        const getDatasets = async () => {
            const datasets = await datasetService.getDatasets();
            setExistingDatasets(datasets);
        };
        getDatasets();
    }, [datasetService]);

    const annotationOptions = React.useMemo(
        () => [...TOP_LEVEL_FILE_ANNOTATIONS, ...customAnnotations].map((a) => a.displayName),
        [customAnnotations]
    );

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
        dispatch(interaction.actions.setCsvColumns(annotations));
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
        const annotationDisplayNameSet = new Set(annotations);
        const annotationNames = [...TOP_LEVEL_FILE_ANNOTATIONS, ...customAnnotations]
            .filter((a) => annotationDisplayNameSet.has(a.displayName))
            .map((a) => a.name);
        dispatch(
            interaction.actions.generatePythonSnippet(dataset, annotationNames, expirationDate)
        );
    };

    const body = (
        <>
            <h4>Step 1: Dataset creation</h4>
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
            <h4>Step 2: Select dataframe columns</h4>
            <p>Select which annotations you would like included as columns in the dataframe.</p>
            <AnnotationSelector
                className={styles.form}
                annotations={annotations}
                annotationOptions={annotationOptions}
                setAnnotations={setAnnotations}
            />
        </>
    );

    return (
        <BaseModal
            body={body}
            footer={
                <PrimaryButton
                    text="Generate"
                    disabled={!annotations.length || !dataset || !expiration}
                    onClick={onGenerate}
                />
            }
            onDismiss={onDismiss}
            title="Generate Python Snippet"
        />
    );
}
