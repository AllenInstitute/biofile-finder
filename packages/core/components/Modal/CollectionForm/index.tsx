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

const styles = require("./CollectionForm.module.css");

interface Props extends ModalProps {
    isEditing?: boolean;
}

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
    "In order to reference this collection, give it a name. If a collection of that name already exists, we’ll create a new version of that collection automatically; any previous versions will still be accessible.",
    "Last, select how long to keep this dataset around. If this is being created for a one-off task, consider selecting a shorter lifespan.",
];

const FIXED_CHECKBOX_TOOLTIP =
    "In order to reproduce your exact selection later, if checked, this will make your collection an immutable, point-in-time snapshot of the metadata for the files you’ve selected (a \"dataset\"). You won't be able to add to or remove from this dataset once created, nor will the files' metadata be modifiable.";
const PRIVATE_CHECK_BOX_TOOLTIP =
    "If checked, this collection will not appear in the collection dropdown for other users as an option. However, this collection will still be able to be sent by you as an FMS File Explorer URL.";

/**
 * Dialog form for generating a customized shareable collection
 */
export default function CollectionForm({ isEditing, onDismiss }: Props) {
    const dispatch = useDispatch();

    const filters = useSelector(interaction.selectors.getFileFiltersForVisibleModal);
    const existingCollections = useSelector(metadata.selectors.getCollections);
    const annotationsPreviouslySelected = useSelector(
        modalSelectors.getAnnotationsPreviouslySelected
    );
    const collection = useSelector(selection.selectors.getSelectedCollection);

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

    const isDisabled =
        !name.trim() || (isFixed && !!selectedAnnotations.length) || (!isEditing && !expiration);

    // Collections can have the same name with different versions, see if this would
    // need to be a new version based on the name
    const nextVersionForName = React.useMemo(() => {
        const matchingExistingCollections = existingCollections
            .filter((c) => c.name === name)
            .sort((a, b) => (a.version > b.version ? -1 : 1));
        if (!matchingExistingCollections.length) {
            return 1;
        }
        return matchingExistingCollections[0].version + 1;
    }, [name, existingCollections]);

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
        } else if (expiration === Expiration.Forever) {
            expirationDate = undefined;
        } else {
            expirationDate = collection?.expiration;
        }

        dispatch(
            interaction.actions.generateShareableFileSelectionLink({
                id: isEditing ? collection?.id : undefined,
                annotations: selectedAnnotations,
                expiration: expirationDate,
                filters,
                fixed: isFixed,
                private: isPrivate,
                name: isEditing ? collection?.name : name,
            })
        );
    };

    const body = (
        <>
            <h4>Step 1: Collection Metadata</h4>
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
            {isEditing && (
                <div className={styles.expirationWarning}>
                    <Icon iconName="InfoSolid" />
                    <h6>Currently expires 10/25/21 02:03:40</h6>
                </div>
            )}
            <div className={classNames(styles.form, styles.collectionForm)}>
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
                            disabled={isEditing}
                            label="Name"
                            value={isEditing ? collection?.name : name}
                            spellCheck={false}
                            onChange={(_, value) => setName(value || "")}
                            placeholder="Enter collection name..."
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
                            <h5 className={styles.checkboxLabel}>
                                Is Fixed?{" "}
                                <TooltipHost content={FIXED_CHECKBOX_TOOLTIP}>
                                    <Icon
                                        className={styles.checkboxInfoIcon}
                                        iconName="InfoSolid"
                                    />
                                </TooltipHost>
                            </h5>
                        </div>
                        <div className={styles.checkboxContainer}>
                            <Checkbox
                                className={styles.checkbox}
                                checked={isPrivate}
                                onChange={(_, checked) => setIsPrivate(checked || false)}
                            />
                            <h5 className={styles.checkboxLabel}>
                                Is Private?{" "}
                                <TooltipHost content={PRIVATE_CHECK_BOX_TOOLTIP}>
                                    <Icon
                                        className={styles.checkboxInfoIcon}
                                        iconName="InfoSolid"
                                    />
                                </TooltipHost>
                            </h5>
                        </div>
                    </div>
                </div>
            </div>
            {isFixed && (
                <>
                    <hr />
                    <h4>Step 2: Select columns</h4>
                    <p>
                        Select which annotations you would like available as metadata in the result.
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
                    text={isEditing ? "Update" : "Generate"}
                    disabled={isDisabled}
                    onClick={onGenerate}
                />
            }
            onDismiss={onDismiss}
            title={isEditing ? `Update ${collection?.name}` : "Generate Collection"}
        />
    );
}
