import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import QueryPart from ".";
import AnnotationPicker from "../AnnotationPicker";
import Tutorial from "../../entity/Tutorial";
import { metadata, selection } from "../../state";

interface Props {
    disabled?: boolean;
    groups: string[];
    showNullGroups?: boolean;
}

/**
 * Component responsible for rendering the "Group" part of the query
 */
export default function QueryGroup(props: Props) {
    const dispatch = useDispatch();
    const shouldShowNullGroups = useSelector(selection.selectors.getShouldShowNullGroups);

    const pathToAnnotationMap = useSelector(metadata.selectors.getAnnotationNameToAnnotationMap);

    const onDelete = (annotationName: string) => {
        dispatch(selection.actions.removeFromAnnotationHierarchy(annotationName));
    };

    const onReorder = (annotationName: string, destinationIndex: number) => {
        dispatch(selection.actions.reorderAnnotationHierarchy(annotationName, destinationIndex));
    };

    return (
        <QueryPart
            title="Group by"
            titleIconName="NumberedListText"
            disabled={props.disabled}
            tutorialId={Tutorial.GROUPING_HEADER_ID}
            onDelete={onDelete}
            onReorder={onReorder}
            onRenderAddMenuList={() => (
                <AnnotationPicker
                    disabledTopLevelAnnotations
                    disableUnavailableAnnotations
                    title="Select metadata to group by"
                    selections={props.groups.map((g) => g.split("."))}
                    setSelections={(annotations) => {
                        dispatch(
                            selection.actions.setAnnotationHierarchy(
                                annotations.map((a) => a.join("."))
                            )
                        );
                    }}
                    shouldShowNullGroups={shouldShowNullGroups}
                />
            )}
            rows={props.groups.map((group) => {
                const annotation = pathToAnnotationMap.get(group);
                // TODO: Avoid this reliance on dot notation
                const path = annotation?.path ?? group.split(".");
                // Prefer annotation.displayName so FMS top-level fields show "File Name"
                // rather than the raw key "file_name".
                const leafLabel = annotation?.displayName ?? path[path.length - 1];
                return {
                    id: group,
                    title: leafLabel,
                    titlePrefixParts: path.slice(0, -1),
                    description: annotation?.description,
                };
            })}
        />
    );
}
