import {
    ChoiceGroup,
    DefaultButton,
    IChoiceGroupOption,
    Icon,
    PrimaryButton,
    TextField,
} from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import { interaction, metadata } from "../../../state";

const styles = require("./FileSetForm.module.css");

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
    "In order to reference this file set, give it a name. If a file set of that name already exists, we’ll create a new version of that file set automatically; any previous versions will still be accessible.",
    "Last, select how long to keep this file set around. If this is being created for a one-off task, consider selecting a shorter lifespan.",
];

/**
 * Dialog form for generating a Python Snippet based on current selection state
 */
export default function FileSetForm({ onDismiss }: ModalProps) {
    const dispatch = useDispatch();

    const existingDatasets = useSelector(metadata.selectors.getDatasets);

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

        dispatch(interaction.actions.generatePythonSnippet(dataset, [], expirationDate));
    };

    const body = (
        <>
            <h4>Step 1: File Set Metadata</h4>
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
                        placeholder="Enter file set name..."
                    />
                    {dataset && (
                        <div className={styles.nameInputSubtext}>
                            This will create version {nextVersionForName} for {dataset}.
                        </div>
                    )}
                </div>
            </div>
        </>
    );

    return (
        <BaseModal
            body={body}
            footer={
                <PrimaryButton
                    text="Generate"
                    disabled={!dataset || !expiration}
                    onClick={onGenerate}
                />
            }
            onDismiss={onDismiss}
            title="Generate Live File Set"
        />
    );
}
