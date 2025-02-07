import * as React from "react";

import ExistingAnnotationPathway from "./ExistingAnnotationPathway";
import NewAnnotationPathway from "./NewAnnotationPathway";
import ChoiceGroup from "../ChoiceGroup";
import useFilteredSelection from "../../hooks/useFilteredSelection";

import styles from "./EditMetadata.module.css";

enum EditMetadataPathway {
    EXISTING = "existing",
    NEW = "new",
}

interface EditMetadataProps {
    className?: string;
    onDismiss: () => void;
    onUnsavedChanges: (hasUnsavedChanges: boolean) => void;
}

/**
 * Form that acts as a wrapper for both metadata editing pathways (new vs existing annotations).
 * Performs all necessary state selections on render and passes data as props to child components
 */
export default function EditMetadataForm(props: EditMetadataProps) {
    const fileSelection = useFilteredSelection();
    const fileCount = fileSelection.count();
    const [editPathway, setEditPathway] = React.useState<EditMetadataPathway>(
        EditMetadataPathway.EXISTING
    );

    return (
        <div className={props.className}>
            <ChoiceGroup
                className={styles.choiceGroup}
                defaultSelectedKey={editPathway}
                onChange={(_ev, option) =>
                    setEditPathway(
                        (option?.key as EditMetadataPathway) || EditMetadataPathway.EXISTING
                    )
                }
                options={[
                    {
                        key: EditMetadataPathway.EXISTING,
                        text: "Existing field",
                        title: "Choose a field that already exists in the data source(s).",
                    },
                    {
                        key: EditMetadataPathway.NEW,
                        text: "New field",
                        title: "Create a new field that doesn't yet exist in the data source(s).",
                    },
                ]}
            />
            <div className={styles.contentWrapper}>
                {editPathway === EditMetadataPathway.EXISTING ? (
                    <ExistingAnnotationPathway
                        onDismiss={props.onDismiss}
                        selectedFileCount={fileCount}
                    />
                ) : (
                    <NewAnnotationPathway
                        onDismiss={props.onDismiss}
                        onUnsavedChanges={() => props.onUnsavedChanges(true)}
                        selectedFileCount={fileCount}
                    />
                )}
            </div>
        </div>
    );
}
