import * as React from "react";
import { useDispatch } from "react-redux";

import QueryPart from ".";
import AnnotationPicker from "../AnnotationPicker";
import Tutorial from "../../entity/Tutorial";
import { selection } from "../../state";

interface Props {
    disabled?: boolean;
    groups: string[];
}

/**
 * Component responsible for rendering the "Group" part of the query
 */
export default function QueryGroup(props: Props) {
    const dispatch = useDispatch();

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
            // TODO: Should we care about display name?? seems time to make the name of
            // annotations just the display name for top level annotations bro
            rows={props.groups.map((annotation) => ({
                id: annotation,
                title: annotation,
            }))}
        />
    );
}
