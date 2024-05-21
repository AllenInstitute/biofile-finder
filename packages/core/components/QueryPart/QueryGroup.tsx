import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import QueryPart from ".";
import AnnotationPicker from "../AnnotationPicker";
import Tutorial from "../../entity/Tutorial";
import { metadata, selection } from "../../state";
import Annotation from "../../entity/Annotation";

interface Props {
    disabled?: boolean;
    groups: string[];
}

/**
 * Component responsible for rendering the "Group" part of the query
 */
export default function QueryGroup(props: Props) {
    const dispatch = useDispatch();

    const annotations = useSelector(metadata.selectors.getSortedAnnotations);

    const selectedAnnotations = props.groups
        .map((annotationName) =>
            annotations.find((annotation) => annotation.name === annotationName)
        )
        .filter((a) => !!a) as Annotation[];

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
                    selections={selectedAnnotations}
                    setSelections={(annotations) => {
                        dispatch(
                            selection.actions.setAnnotationHierarchy(annotations.map((a) => a.name))
                        );
                    }}
                />
            )}
            rows={selectedAnnotations.map((annotation) => ({
                id: annotation.name,
                title: annotation.displayName,
            }))}
        />
    );
}
