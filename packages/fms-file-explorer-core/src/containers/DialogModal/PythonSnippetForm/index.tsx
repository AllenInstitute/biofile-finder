import {
    ChoiceGroup,
    Dialog,
    DialogFooter,
    IChoiceGroupOption,
    PrimaryButton,
    Spinner,
    SpinnerSize,
    TextField,
} from "office-ui-fabric-react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { DialogModalProps } from "..";
import { interaction, metadata } from "../../../state";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../../constants";
import AnnotationSelector from "../../../components/AnnotationSelector";
import { Dataset } from "../../../services/DatasetService";

const styles = require("./PythonSnippetForm.module.css");

const DIALOG_CONTENT_PROPS = {
    title: "Generate Python Snippet",
    subText:
        "Select which annotations you would like included as columns in the dataframe & what kind of snippet to generate",
};
const MODAL_PROPS = {
    isBlocking: false,
};

const TOP_LEVEL_FILE_ANNOTATION_NAMES = TOP_LEVEL_FILE_ANNOTATIONS.map((a) => a.displayName);

export enum SnippetType {
    Query = "Query (live, updates over time)",
    Dataset = "Dataset (immutable file set)",
}
export enum Expiration {
    OneWeek = "1 Week",
    SixMonths = "6 Months",
    OneYear = "1 Year",
    ThreeYears = "3 Years",
    Forever = "Forever",
}
const SNIPPET_TYPES: IChoiceGroupOption[] = [
    {
        key: SnippetType.Query,
        text: SnippetType.Query,
        onRenderLabel() {
            return (
                <div className={styles.label}>
                    Query <span className={styles.labelDescription}>(live, updates over time)</span>
                </div>
            );
        },
    },
    {
        key: SnippetType.Dataset,
        text: SnippetType.Dataset,
        onRenderLabel() {
            return (
                <div className={styles.label}>
                    Dataset <span className={styles.labelDescription}>(immutable file set)</span>
                </div>
            );
        },
    },
];
const EXPIRATIONS: IChoiceGroupOption[] = Object.values(Expiration).map((key) => ({
    key,
    text: key,
}));

/**
 * Dialog form for generating a Python Snippet based on current selection state
 */
export default function PythonSnippetForm({ onDismiss }: DialogModalProps) {
    const dispatch = useDispatch();
    const customAnnotations = useSelector(metadata.selectors.getSortedAnnotations);
    const allAnnotations = [...TOP_LEVEL_FILE_ANNOTATIONS, ...customAnnotations];
    const annotationOptions = allAnnotations.map((a) => a.displayName);
    const columnsSavedFromLastTime = useSelector(interaction.selectors.getCsvColumns);
    const datasetService = useSelector(interaction.selectors.getDatasetService);

    const defaultAnnotations = columnsSavedFromLastTime
        ? columnsSavedFromLastTime
        : [...TOP_LEVEL_FILE_ANNOTATION_NAMES];
    const [isLoading, setIsLoading] = React.useState(false);
    const [annotations, setAnnotations] = React.useState<string[]>(defaultAnnotations);
    const [snippetType, setSnippetType] = React.useState<string>(SnippetType.Query);
    const [expiration, setExpiration] = React.useState<string>(Expiration.Forever);
    const [dataset, setDataset] = React.useState<string>();
    const [existingDatasets, setExistingDatasets] = React.useState<Dataset[]>([]);

    // Determine the existing datasets to provide some feedback on the input dataset (if any)
    React.useEffect(() => {
        const getDatasets = async () => {
            const datasets = await datasetService.getDatasets();
            setExistingDatasets(datasets);
        };
        getDatasets();
    }, [datasetService]);

    // Datasets can have the same name with different versions, see if this would
    // need to be a new version based on the name
    const nextVersionForName = React.useMemo(() => {
        const matchingExistingDatasets = existingDatasets
            .filter((d) => d.name === dataset)
            .sort((a, b) => (a.version > b.version ? 1 : -1));
        if (!matchingExistingDatasets.length) {
            return undefined;
        }
        return matchingExistingDatasets[0].version;
    }, [dataset, existingDatasets]);

    const onGenerate = () => {
        setIsLoading(true);
        dispatch(interaction.actions.setCsvColumns(annotations));
        let expirationDate: Date | undefined = new Date();
        if (expiration === Expiration.OneWeek) {
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
            interaction.actions.generatePythonSnippet(
                snippetType as SnippetType,
                dataset,
                expirationDate,
                annotations
            )
        );
    };

    return (
        <Dialog
            hidden={false}
            onDismiss={onDismiss}
            dialogContentProps={DIALOG_CONTENT_PROPS}
            modalProps={MODAL_PROPS}
        >
            {isLoading ? (
                <Spinner size={SpinnerSize.small} data-testid="python-snippet-loading-icon" />
            ) : (
                <div>
                    <AnnotationSelector
                        annotations={annotations}
                        annotationOptions={annotationOptions}
                        setAnnotations={setAnnotations}
                    />
                    <hr />
                    <ChoiceGroup
                        selectedKey={snippetType}
                        options={SNIPPET_TYPES}
                        onChange={(_, o) => o && setSnippetType(o.key)}
                    />
                    {snippetType === SnippetType.Dataset && (
                        <div className={styles.datasetForm}>
                            <ChoiceGroup
                                label="Expiration"
                                selectedKey={expiration}
                                options={EXPIRATIONS}
                                onChange={(_, o) => o && setExpiration(o.key)}
                            />
                            <TextField
                                autoFocus
                                label="Name"
                                description={
                                    nextVersionForName
                                        ? `Name already exists, can create version ${nextVersionForName}`
                                        : undefined
                                }
                                value={dataset}
                                spellCheck={false}
                                onChange={(_, value) => setDataset(value)}
                            />
                        </div>
                    )}
                    <DialogFooter>
                        <PrimaryButton
                            text="Generate"
                            disabled={
                                !annotations.length ||
                                (snippetType === SnippetType.Dataset && !dataset)
                            }
                            onClick={onGenerate}
                        />
                    </DialogFooter>
                </div>
            )}
        </Dialog>
    );
}
