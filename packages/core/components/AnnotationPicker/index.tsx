import * as React from "react";
import { useSelector } from "react-redux";

import ListPicker, { ListItem } from "../ListPicker";
import Annotation from "../../entity/Annotation";
import { metadata, selection } from "../../state";

interface Props {
    hasSelectAllCapability?: boolean;
    disableUnavailableAnnotations?: boolean;
    className?: string;
    selections: Annotation[];
    annotationSubMenuRenderer?: (
        item: ListItem<Annotation>
    ) => React.ReactElement<ListItem<Annotation>>;
    setSelections: (annotations: Annotation[]) => void;
}

/**
 * Form for selecting which annotations to use in some exterior context like
 * downloading a manifest.
 */
export default function AnnotationPicker(props: Props) {
    const annotations = useSelector(metadata.selectors.getSortedAnnotations);
    const unavailableAnnotations = useSelector(
        selection.selectors.getUnavailableAnnotationsForHierarchy
    );
    const areAvailableAnnotationLoading = useSelector(
        selection.selectors.getAvailableAnnotationsForHierarchyLoading
    );

    const items = annotations.map((annotation) => ({
        selected: props.selections.includes(annotation),
        disabled: unavailableAnnotations.includes(annotation),
        loading: areAvailableAnnotationLoading,
        description: annotation.description,
        data: annotation,
        value: annotation.name,
        displayValue: annotation.displayName,
    }));

    const removeSelection = (item: ListItem<Annotation>) => {
        props.setSelections(props.selections.filter((annotation) => annotation !== item.data));
    };

    const addSelection = (item: ListItem<Annotation>) => {
        // Should never be undefined, included as guard statement to satisfy compiler
        if (item.data) {
            props.setSelections([...props.selections, item.data]);
        }
    };

    return (
        <ListPicker
            className={props.className}
            items={items}
            onDeselect={removeSelection}
            onSelect={addSelection}
            onSelectAll={
                props.hasSelectAllCapability ? () => props.setSelections?.(annotations) : undefined
            }
            onDeselectAll={() => props.setSelections([])}
            subMenuRenderer={props.annotationSubMenuRenderer}
        />
    );
}
