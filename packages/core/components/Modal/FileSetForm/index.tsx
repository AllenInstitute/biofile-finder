import {
    Checkbox,
    ChoiceGroup,
    DefaultButton,
    IChoiceGroupOption,
    Icon,
    PrimaryButton,
    TextField,
    TooltipHost,
} from "@fluentui/react";
import classNames from "classnames";
import { isEmpty } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import Annotation from "../../../entity/Annotation";
import { interaction, metadata, selection } from "../../../state";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../../constants";
import AnnotationSelector from "../AnnotationSelector";
import * as modalSelectors from "../selectors";

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

const SUBTITLES = [
    "In order to reference this file set, give it a name. If a file set of that name already exists, we’ll create a new version of that file set automatically; any previous versions will still be accessible.",
    "Last, select how long to keep this dataset around. If this is being created for a one-off task, consider selecting a shorter lifespan.",
];

const FIXED_CHECKBOX_TOOLTIP = "In order to reproduce your exact selection later, if checked, this will make your file set an immutable, point-in-time snapshot of the metadata for the files you’ve selected (a \"dataset\"). You won't be able to add to or remove from this dataset once created, nor will the files' metadata be modifiable.";
const PRIVATE_CHECK_BOX_TOOLTIP = "If checked, this file set will not appear in the file set dropdown for other users as an option. However, this file set will still be able to be sent by you as an FMS File Explorer URL."

/**
 * Dialog form for generating a customized shareable file set
 */
export default function FileSetForm({ onDismiss }: ModalProps) {
    const dispatch = useDispatch();

    const filters = useSelector(interaction.selectors.getFileFiltersForVisibleModal);
    const existingDatasets = useSelector(metadata.selectors.getDatasets);
    const annotationsPreviouslySelected = useSelector(
        modalSelectors.getAnnotationsPreviouslySelected
    );
    const [selectedAnnotations, setSelectedAnnotations] = React.useState<Annotation[]>(() =>
        isEmpty(annotationsPreviouslySelected)
            ? [...TOP_LEVEL_FILE_ANNOTATIONS]
            : annotationsPreviouslySelected
    );

    const [isFixed, setIsFixed] = React.useState(false);
    const [isPrivate, setIsPrivate] = React.useState(true);
    const [expiration, setExpiration] = React.useState<string>();
    const [name, setName] = React.useState<string>("");
    const [isSubtitleExpanded, setIsSubtitleExpanded] = React.useState(true);

    // Datasets can have the same name with different versions, see if this would
    // need to be a new version based on the name
    const nextVersionForName = React.useMemo(() => {
        const matchingExistingDatasets = existingDatasets
            .filter((d) => d.name === name)
            .sort((a, b) => (a.version > b.version ? -1 : 1));
        if (!matchingExistingDatasets.length) {
            return 1;
        }
        return matchingExistingDatasets[0].version + 1;
    }, [name, existingDatasets]);

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
            interaction.actions.generateShareableFileSelectionLink({
                annotations: selectedAnnotations,
                expiration: expirationDate,
                filters,
                fixed: isFixed,
                private: isPrivate,
                name,
            })
        );
    };

    const body = (
        <>
            <h4>Step 1: File Set Metadata</h4>
            {isSubtitleExpanded ? (
                <div>
                    {SUBTITLES.map((text) => (
                        <p key={text}>{text}</p>
                    ))}
                    <div className={styles.subtitleButtonContainer}>
                        <DefaultButton
                            className={styles.subtitleButton}
                            onClick={() => setIsSubtitleExpanded(false)}
                        >
                            LESS&nbsp;
                            <Icon iconName="CaretSolidUp" />
                        </DefaultButton>
                    </div>
                </div>
            ) : (
                <div>
                    <div className={styles.subtitle}>{SUBTITLES[0].slice(0, 75) + "..."}</div>
                    <div className={styles.subtitleButtonContainer}>
                        <DefaultButton
                            className={styles.subtitleButton}
                            onClick={() => setIsSubtitleExpanded(true)}
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
                <div className={styles.metadataForm}>
                    <div className={styles.nameInput}>
                        <TextField
                            autoFocus
                            label="Name"
                            value={name}
                            spellCheck={false}
                            onChange={(_, value) => setName(value || "")}
                            placeholder="Enter file set name..."
                        />
                        {name && (
                            <div className={styles.nameInputSubtext}>
                                This will create version {nextVersionForName} for {name}.
                            </div>
                        )}
                    </div>
                    <div className={styles.checkboxRow}>
                        <div className={styles.checkboxContainer}>
                            <Checkbox
                             className={styles.checkbox}
                                checked={isFixed}
                                onChange={(_, checked) => setIsFixed(checked || false)}
                            />
                            <h5 className={styles.checkboxLabel}>Is Fixed? <TooltipHost content={FIXED_CHECKBOX_TOOLTIP}><Icon className={styles.checkboxInfoIcon} iconName="InfoSolid" /></TooltipHost></h5>
                        </div>
                        <div className={styles.checkboxContainer}>
                            <Checkbox
                             className={styles.checkbox}
                                checked={isPrivate}
                                onChange={(_, checked) => setIsPrivate(checked || false)}
                            />
                            <h5 className={styles.checkboxLabel}>Is Private? <TooltipHost content={PRIVATE_CHECK_BOX_TOOLTIP}><Icon className={styles.checkboxInfoIcon} iconName="InfoSolid" /></TooltipHost></h5>
                        </div>
                    </div>
                </div>
            </div>
            {isFixed && (
                <>
                    <hr />
                    <h4>Step 2: Select columns</h4>
                    <p>Select which annotations you would like available as metadata in the result.</p>
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
                    disabled={!name || !expiration || (isFixed && !selectedAnnotations.length)}
                    onClick={onGenerate}
                />
            }
            onDismiss={onDismiss}
            title="Generate File Set"
        />
    );
}
