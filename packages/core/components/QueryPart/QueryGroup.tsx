import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import QueryPart from ".";
import AnnotationPicker from "../AnnotationPicker";
import Tutorial from "../../entity/Tutorial";
import { metadata, selection } from "../../state";

interface Props {
    disabled?: boolean;
    groups: string[];
}

/**
 * Component responsible for rendering the "Group" part of the query
 */
export default function QueryGroup(props: Props) {
    const dispatch = useDispatch();

    const annotationNameToAnnotationMap = useSelector(
        metadata.selectors.getAnnotationNameToAnnotationMap
    );

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
                    selections={props.groups}
                    setSelections={(annotations) => {
                        dispatch(selection.actions.setAnnotationHierarchy(annotations));
                    }}
                />
            )}
            rows={props.groups.map((group) => ({
                id: group,
                title: group,
                description: annotationNameToAnnotationMap[group]?.description,
            }))}
        />
    );
}
