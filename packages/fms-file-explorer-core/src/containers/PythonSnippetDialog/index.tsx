import {
    ChoiceGroup,
    Dialog,
    DialogFooter,
    IChoiceGroupOption,
    IconButton,
    PrimaryButton,
    TextField,
} from "office-ui-fabric-react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction, metadata } from "../../state";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../constants";
import AnnotationSelector from "../../components/AnnotationSelector/AnnotationSelector";

const styles = require("./PythonSnippetDialog.module.css");

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
    ThreeYears = "3 Year",
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

const PYTHON_SETUP = "pip install aicsfiles";

const COPY_ICON = { iconName: "copy" };

/**
 * TODO
 */
export default function PythonSnippetDialog() {
    const dispatch = useDispatch();
    const customAnnotations = useSelector(metadata.selectors.getSortedAnnotations);
    const allAnnotations = [...TOP_LEVEL_FILE_ANNOTATIONS, ...customAnnotations];
    const annotationOptions = allAnnotations.map((a) => a.displayName);
    const columnsSavedFromLastTime = useSelector(interaction.selectors.getCsvColumns);
    const isVisible = useSelector(interaction.selectors.isPythonSnippetDialogVisible);
    const pythonSnippet = useSelector(interaction.selectors.getPythonSnippet);

    const defaultAnnotations = columnsSavedFromLastTime
        ? columnsSavedFromLastTime
        : [...TOP_LEVEL_FILE_ANNOTATION_NAMES];
    const [annotations, setAnnotations] = React.useState<string[]>(defaultAnnotations);
    const [snippetType, setSnippetType] = React.useState<string>(SnippetType.Query);
    const [expiration, setExpiration] = React.useState<string>(Expiration.Forever);
    const [dataset, setDataset] = React.useState<string>();

    if (pythonSnippet) {
        const onCopySetup = () => {
            navigator.clipboard.writeText(PYTHON_SETUP);
        };
        const onCopyCode = () => {
            navigator.clipboard.writeText(pythonSnippet);
        };

        return (
            <Dialog
                hidden={!isVisible}
                onDismiss={() => dispatch(interaction.actions.togglePythonSnippetDialogAction())}
                modalProps={MODAL_PROPS}
            >
                {/* TODO: Feedback on when things are copied would be nice */}
                <div className={styles.snippetHeader}>
                    <span className={styles.snippetLabel}>Setup</span>
                    <IconButton
                        className={styles.copyButton}
                        iconProps={COPY_ICON}
                        onClick={onCopySetup}
                    />
                </div>
                <div className={styles.snippet}>{PYTHON_SETUP}</div>
                <div className={styles.snippetHeader}>
                    <span className={styles.snippetLabel}>Code</span>
                    <IconButton
                        className={styles.copyButton}
                        iconProps={COPY_ICON}
                        onClick={onCopyCode}
                    />
                </div>
                <div className={styles.snippet}>{pythonSnippet}</div>
            </Dialog>
        );
    }

    const onGenerate = () => {
        dispatch(interaction.actions.setCsvColumns(annotations));
        dispatch(
            interaction.actions.generatePythonSnippet(
                snippetType as SnippetType,
                dataset,
                expiration as Expiration,
                annotations
            )
        );
    };

    return (
        <Dialog
            hidden={!isVisible}
            onDismiss={() => dispatch(interaction.actions.togglePythonSnippetDialogAction())}
            dialogContentProps={DIALOG_CONTENT_PROPS}
            modalProps={MODAL_PROPS}
        >
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
                <div className={styles.datasetInput}>
                    <ChoiceGroup
                        label="Expiration"
                        selectedKey={expiration}
                        options={EXPIRATIONS}
                        onChange={(_, o) => o && setExpiration(o.key)}
                    />
                    {/* TODO: If others exist with name warn user of version bump */}
                    <TextField
                        autoFocus
                        label="Name"
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
                        !annotations.length || (snippetType === SnippetType.Dataset && !dataset)
                    }
                    onClick={onGenerate}
                />
            </DialogFooter>
        </Dialog>
    );
}
