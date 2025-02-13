import classNames from "classnames";
import * as React from "react";
import { useSelector } from "react-redux";

import ExistingAnnotationPathway from "./ExistingAnnotationPathway";
import NewAnnotationPathway from "./NewAnnotationPathway";
import ChoiceGroup from "../ChoiceGroup";
import { TOP_LEVEL_FILE_ANNOTATION_NAMES } from "../../constants";
import { metadata, selection } from "../../state";

import styles from "./EditMetadata.module.css";

enum EditMetadataPathway {
    EXISTING = "existing",
    NEW = "new",
}

interface EditMetadataProps {
    className?: string;
    onDismiss: () => void;
    setHasUnsavedChanges: (hasUnsavedChanges: boolean) => void;
}

/**
 * Form that acts as a wrapper for both metadata editing pathways (new vs existing annotations).
 * Performs all necessary state selections on render and passes data as props to child components
 */
export default function EditMetadataForm(props: EditMetadataProps) {
    const fileSelection = useSelector(selection.selectors.getFileSelection);
    const fileCount = fileSelection.count();
    // Don't allow users to edit top level annotations (e.g., File Name)
    const annotationOptions = useSelector(metadata.selectors.getSortedAnnotations)
        .filter((annotation) => !TOP_LEVEL_FILE_ANNOTATION_NAMES.includes(annotation.name))
        .map((annotation) => {
            return {
                key: annotation.name,
                text: annotation.displayName,
                data: annotation.type,
            };
        });
    const [editPathway, setEditPathway] = React.useState<EditMetadataPathway>(
        EditMetadataPathway.EXISTING
    );
    const [annotationValueMap, setAnnotationValueMap] = React.useState<Map<string, any>>();

    React.useEffect(() => {
        fileSelection.fetchAllDetails().then((fileDetails) => {
            const annotationMapping = new Map();
            // Group details by annotation with a count for each value
            fileDetails.forEach((file) => {
                file.annotations.map((annotation) => {
                    // For now, if a file has multiple values for an annotation it should be considered a distinct set
                    const joinedValues = annotation.values.join(", ");
                    if (!annotationMapping.has(annotation.name)) {
                        annotationMapping.set(annotation.name, { [joinedValues]: 1 });
                    } else {
                        const existing = annotationMapping.get(annotation.name);
                        annotationMapping.set(annotation.name, {
                            ...existing,
                            [joinedValues]: existing?.[joinedValues]
                                ? existing[joinedValues] + 1
                                : 1,
                        });
                    }
                });
            });
            setAnnotationValueMap(annotationMapping);
        });
    }, [fileSelection]);

    return (
        <div className={classNames(props.className, styles.root)}>
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
                        annotationValueMap={annotationValueMap}
                        annotationOptions={annotationOptions}
                        selectedFileCount={fileCount}
                    />
                ) : (
                    <NewAnnotationPathway
                        onDismiss={props.onDismiss}
                        setHasUnsavedChanges={(arg) => props.setHasUnsavedChanges(arg)}
                        annotationOptions={annotationOptions}
                        selectedFileCount={fileCount}
                    />
                )}
            </div>
        </div>
    );
}
