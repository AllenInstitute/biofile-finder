import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import ExistingAnnotationPathway from "./ExistingAnnotationPathway";
import NewAnnotationPathway from "./NewAnnotationPathway";
import ChoiceGroup from "../ChoiceGroup";
import { TOP_LEVEL_FILE_ANNOTATION_NAMES } from "../../constants";
import { interaction, metadata, selection } from "../../state";

import styles from "./EditMetadata.module.css";

enum EditMetadataPathway {
    EXISTING = "existing",
    NEW = "new",
}

/**
 * Form that acts as a wrapper for both metadata editing pathways (new vs existing annotations).
 * Performs all necessary state selections on render and passes data as props to child components
 */
export default function EditMetadataForm() {
    const dispatch = useDispatch();
    const fileSelection = useSelector(selection.selectors.getFileSelection);
    const onDismiss = () => {
        dispatch(interaction.actions.hideVisibleModal());
    };
    // Don't allow users to edit top level annotations (e.g., File Name)
    const annotationOptions = useSelector(metadata.selectors.getSortedAnnotations)
        .filter((annotation) => !TOP_LEVEL_FILE_ANNOTATION_NAMES.includes(annotation.name))
        .map((annotation) => {
            return {
                key: annotation.name,
                text: annotation.displayName,
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
        <>
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
                    },
                    {
                        key: EditMetadataPathway.NEW,
                        text: "New field",
                    },
                ]}
            />
            <div className={styles.contentWrapper}>
                {editPathway === EditMetadataPathway.EXISTING ? (
                    <ExistingAnnotationPathway
                        onDismiss={onDismiss}
                        annotationValueMap={annotationValueMap}
                        annotationOptions={annotationOptions}
                        selectedFileCount={fileSelection.count()}
                    />
                ) : (
                    <NewAnnotationPathway
                        onDismiss={onDismiss}
                        selectedFileCount={fileSelection.count()}
                    />
                )}
            </div>
        </>
    );
}
